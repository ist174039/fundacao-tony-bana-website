import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { resolveDocumentActor, documentFeatureReady, canOperateDocument } from '@/lib/server/document-service'
import { VALID_ID, parseDocumentEdit, parseDocumentStatusChange, sealDocumentName, DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'

export const runtime='nodejs'
const fail=(error:string,status:number)=>NextResponse.json({error},{status})
const statuses=new Set(['active','archived'])
async function access(request:Request,id:string){
 if(!documentFeatureReady())return {error:fail('Documentos indisponíveis.',503)}
 const actor=await resolveDocumentActor(request)
 if(!actor)return {error:fail('Sem permissão.',403)}
 if(!VALID_ID.test(id))return {error:fail('Documento inválido.',400)}
 return {actor}
}

/** Metadata edit: immutable bytes, versions, team and original creator are preserved.
 * Cross-team movements and privilege-widening classification downgrades are forbidden.
 */
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const ctx=await access(request,params.id);if('error' in ctx)return ctx.error
 try{
  const body=await request.json()
  if(body?.operation==='restore'){
   if(!ctx.actor.admin)return fail('A restauração exige um administrador.',403)
   const {expectedRevision,reason}=parseDocumentStatusChange(body)
   return await changeStatus(params.id,'archived','active',expectedRevision,reason,ctx.actor.uid)
  }
  const input=parseDocumentEdit(body)
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const doc=await tx.get(ref)
   if(!doc.exists)return 'missing'
   const previous=doc.data()!
   if(previous.status==='archived')return 'archived'
   if(!canOperateDocument(ctx.actor,previous,'update'))return 'denied'
   if(Number(previous.revision||0)!==input.expectedRevision)return 'conflict'
   const folder=await tx.get(db.collection('area_doc_folders').doc(input.folderId))
   if(!folder.exists||folder.get('teamId')!==previous.teamId)return 'folder-invalid'
   if(previous.classification!==input.classification&&!ctx.actor.admin)return 'classification-denied'
   const acl=previous.acl
   if(input.classification!=='internal'&&(!Array.isArray(acl?.userUids)||acl.userUids.length===0))return 'acl-invalid'
   const now=new Date().toISOString()
   const changes={dadosPrivados:sealDocumentName(input.name,ref.path),folderId:input.folderId,classification:input.classification,
    revision:input.expectedRevision+1,updatedAt:now,updatedBy:ctx.actor.uid}
   tx.update(ref,changes)
   appendAuditEvent(tx,db,{module:'documents',action:'update',recordPath:ref.path,actorUid:ctx.actor.uid,before:previous,after:{...previous,...changes},at:now})
   return 'updated'
  })
  if(result==='missing')return fail('Documento não encontrado.',404)
  if(result==='archived')return fail('Documento arquivado. Restaura antes de editar.',409)
  if(result==='denied'||result==='classification-denied')return fail('Sem permissão para esta alteração.',403)
  if(result==='conflict')return fail('Este documento foi alterado por outra pessoa. Atualiza a lista.',409)
  if(result==='folder-invalid')return fail('A pasta deve existir e pertencer à equipa do documento.',422)
  if(result==='acl-invalid')return fail('A classificação confidencial exige utilizadores explicitamente autorizados.',422)
  return NextResponse.json({success:true,revision:input.expectedRevision+1})
 }catch(e){
  if(e instanceof DocumentWorkspaceError||e instanceof SyntaxError)return fail(e.message,400)
  console.error('[documents] Metadata update failed')
  return fail('Não foi possível editar o documento.',500)
 }
}

async function changeStatus(id:string,from:string,to:string,expectedRevision:number,reason:string,uid:string){
 const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(id)
 const result=await db.runTransaction(async tx=>{
  const doc=await tx.get(ref)
  if(!doc.exists)return 'missing'
  const previous=doc.data()!
  if((previous.status||'active')!==from)return 'state'
  if(Number(previous.revision||0)!==expectedRevision)return 'conflict'
  const now=new Date().toISOString()
  const changes={status:to,revision:expectedRevision+1,updatedAt:now,updatedBy:uid,
   ...(to==='archived'?{archivedAt:now,archivedBy:uid,archiveReason:reason}:
     {restoredAt:now,restoredBy:uid,restoreReason:reason})}
  tx.update(ref,changes)
  appendAuditEvent(tx,db,{module:'documents',action:to==='archived'?'delete':'update',recordPath:ref.path,actorUid:uid,before:previous,after:{...previous,...changes},at:now})
  const operation=db.collection('area_doc_audit').doc()
  tx.create(operation,{kind:to==='archived'?'document-archived':'document-restored',
   documentId:id,actorUid:uid,at:now,reason})
  return 'updated'
 })
 if(result==='missing')return fail('Documento não encontrado.',404)
 if(result==='state')return fail('O estado do documento já foi alterado.',409)
 if(result==='conflict')return fail('O documento foi alterado por outra pessoa. Atualiza antes de repetir.',409)
 return NextResponse.json({success:true,status:to,revision:expectedRevision+1})
}

/** Logical deletion; no storage objects or version history are physically removed. */
export async function DELETE(request:Request,{params}:{params:{id:string}}){
 const ctx=await access(request,params.id);if('error' in ctx)return ctx.error
 try{
  const input=parseDocumentStatusChange(await request.json())
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(params.id),doc=await ref.get()
  if(!doc.exists)return fail('Documento não encontrado.',404)
  if(!canOperateDocument(ctx.actor,doc.data()!,'delete'))return fail('Sem permissão para apagar este documento.',403)
  return await changeStatus(params.id,'active','archived',input.expectedRevision,input.reason,ctx.actor.uid)
 }catch(e){
  if(e instanceof DocumentWorkspaceError||e instanceof SyntaxError)return fail(e.message,400)
  console.error('[documents] Archive failed')
  return fail('Não foi possível arquivar o documento.',500)
 }
}
