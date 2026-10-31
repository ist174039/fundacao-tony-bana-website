import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,canOperateDocument,privateDocumentBucket } from '@/lib/server/document-service'
import { MAX_FILE_SIZE,VALID_ID,validateUploadBytes,DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'
import { nextDocumentVersion } from '@/lib/server/document-library.mjs'
export const runtime='nodejs'
const fail=(error:string,status:number)=>NextResponse.json({error},{status})
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return fail('Documentos indisponíveis.',503)
 const actor=await resolveDocumentActor(request)
 if(!actor)return fail('Sem permissão.',403)
 if(!VALID_ID.test(params.id))return fail('Documento inválido.',400)
 try{
  const doc=await getFirebaseAdminFirestore().collection('area_doc_files').doc(params.id).get()
  if(!doc.exists||doc.get('status')==='archived'||!canOperateDocument(actor,doc.data()!,'read'))return fail('Documento não encontrado ou sem acesso.',404)
  const versions=await doc.ref.collection('versions').orderBy('version','desc').limit(50).get()
  return NextResponse.json({versions:versions.docs.map(d=>({version:d.get('version'),sha256:d.get('sha256'),byteLength:d.get('byteLength'),createdAt:d.get('createdAt'),createdBy:d.get('createdBy')}))})
 }catch{return fail('Não foi possível consultar versões.',500)}
}
export async function POST(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return fail('Documentos indisponíveis.',503)
 const actor=await resolveDocumentActor(request)
 if(!actor)return fail('Sem permissão.',403)
 if(!VALID_ID.test(params.id))return fail('Documento inválido.',400)
 const size=Number(request.headers.get('content-length')||'0')
 if(!Number.isFinite(size)||size>MAX_FILE_SIZE+2_000_000)return fail('Ficheiro demasiado grande.',413)
 let storagePath:string|null=null,uploaded=false
 try{
  const form=await request.formData(),file=form.get('file'),expected=Number(form.get('expectedVersion'))
  if(!(file instanceof File)||!Number.isInteger(expected)||expected<1||expected>=50)return fail('Ficheiro ou versão inválida.',400)
  if(file.size>MAX_FILE_SIZE||file.size<1)return fail('Ficheiro demasiado grande ou vazio.',413)
  const blob=Buffer.from(await file.arrayBuffer())
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(params.id),snapshot=await ref.get()
  if(!snapshot.exists||snapshot.get('status')==='archived'||!canOperateDocument(actor,snapshot.data()!,'update'))return fail('Documento inexistente ou sem permissão.',404)
  if(snapshot.get('latestVersion')!==expected)return fail('Existe uma versão mais recente. Atualiza antes de carregar.',409)
  if(file.type!==snapshot.get('mimeType'))return fail('O formato de ficheiro tem de coincidir com a versão anterior.',400)
  validateUploadBytes(blob,file.type)
  const previous=Array.from({length:expected},(_,i)=>({version:i+1}))
  storagePath=`private/documents/${params.id}/v${expected+1}`
  const stamp=new Date().toISOString()
  const version=nextDocumentVersion(previous,{blob,storagePath,actorUid:actor.uid,now:stamp})
  await privateDocumentBucket().file(storagePath).save(blob,{resumable:false,contentType:'application/octet-stream',preconditionOpts:{ifGenerationMatch:0}})
  uploaded=true
  const audit=db.collection('area_doc_audit').doc()
  const saved=await db.runTransaction(async tx=>{
   const current=await tx.get(ref)
   if(!current.exists||current.get('status')==='archived'||current.get('latestVersion')!==expected||!canOperateDocument(actor,current.data()!,'update'))return false
   const versionRef=ref.collection('versions').doc(String(expected+1).padStart(6,'0'))
   tx.create(versionRef,version)
   appendAuditEvent(tx,db,{module:'document-versions',action:'create',recordPath:versionRef.path,actorUid:actor.uid,after:version,at:stamp})
   const updated={latestVersion:expected+1,revision:Number(current.get('revision')||0)+1,updatedAt:stamp,updatedBy:actor.uid}
   tx.update(ref,updated)
   appendAuditEvent(tx,db,{module:'documents',action:'update',recordPath:ref.path,actorUid:actor.uid,before:current.data(),after:{...current.data(),...updated},at:stamp})
   tx.create(audit,{kind:'document-version-uploaded',documentId:params.id,actorUid:actor.uid,at:stamp,version:expected+1})
   return true
  })
  if(!saved){await privateDocumentBucket().file(storagePath).delete({ignoreNotFound:true});uploaded=false;return fail('Outra pessoa atualizou o documento. Atualiza e tenta novamente.',409)}
  uploaded=false
  return NextResponse.json({version:expected+1,sha256:version.sha256},{status:201})
 }catch(error){
  if(uploaded&&storagePath)try{await privateDocumentBucket().file(storagePath).delete({ignoreNotFound:true})}catch{}
  if(error instanceof DocumentWorkspaceError||error instanceof SyntaxError)return fail(error.message,400)
  // ifGenerationMatch 0 rejects a competing write; never overwrite the existing version.
  if((error as {code?:number})?.code===412)return fail('Esta versão já existe. Atualiza e tenta novamente.',409)
  return fail('Não foi possível guardar a versão.',500)
 }
}
