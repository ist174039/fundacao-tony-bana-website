import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { documentFeatureReady, resolveDocumentActor, canWriteTeam } from '@/lib/server/document-service'
import { VALID_ID, parseDocumentFolderRename, DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'

export const runtime='nodejs'
const fail=(error:string,status:number)=>NextResponse.json({error},{status})

/** A folder may be renamed, but not moved across teams or parents.
 * Moving or deleting requires a separate audited referential-integrity workflow.
 */
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return fail('Documentos indisponíveis.',503)
 const actor=await resolveDocumentActor(request)
 if(!actor)return fail('Sem permissão.',403)
 if(!VALID_ID.test(params.id))return fail('Pasta inválida.',400)
 try{
  const {name}=parseDocumentFolderRename(await request.json())
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_folders').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const current=await tx.get(ref)
   if(!current.exists)return 'missing'
   const teamId=current.get('teamId')
   if(!canWriteTeam(actor,teamId,'update'))return 'denied'
   if(current.get('name')===name)return 'unchanged'
   const stamp=new Date().toISOString()
   const patch={name,updatedAt:stamp,updatedBy:actor.uid}
   tx.update(ref,patch)
   appendAuditEvent(tx,db,{module:'document-folders',action:'update',recordPath:ref.path,actorUid:actor.uid,before:current.data(),after:{...current.data(),...patch},at:stamp})
   return 'updated'
  })
  if(result==='missing')return fail('Pasta não encontrada.',404)
  if(result==='denied')return fail('Sem permissão para editar esta pasta.',403)
  return NextResponse.json({success:true,name,changed:result==='updated'})
 }catch(e){
  if(e instanceof DocumentWorkspaceError||e instanceof SyntaxError)return fail(e.message,400)
  console.error('[document-folders] rename failed')
  return fail('Não foi possível alterar a pasta.',500)
 }
}
