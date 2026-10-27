import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,canWriteTeam,canOperateDocument,documentView,privateDocumentBucket } from '@/lib/server/document-service'
import { parseFileUpload,sealDocumentName,buildDocumentAcl,VALID_ID,MAX_FILE_SIZE,DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'
import { nextDocumentVersion } from '@/lib/server/document-library.mjs'
export const runtime='nodejs'
const fail=(error:string,status:number)=>NextResponse.json({error},{status})
export async function GET(request:Request){
 if(!documentFeatureReady())return fail('Biblioteca de documentos indisponível.',503)
 const actor=await resolveDocumentActor(request)
 if(!actor)return fail('Sem permissão.',403)
 try{
  const rows=await getFirebaseAdminFirestore().collection('area_doc_files').orderBy('updatedAt','desc').limit(300).get()
  return NextResponse.json({documents:rows.docs.filter(d=>canOperateDocument(actor,d.data(),'read')).map(d=>documentView(d,d.data()))})
 }catch{return fail('Não foi possível consultar documentos.',500)}
}
export async function POST(request:Request){
 if(!documentFeatureReady())return fail('Biblioteca de documentos indisponível.',503)
 const actor=await resolveDocumentActor(request)
 if(!actor)return fail('Sem permissão.',403)
 const contentLength=Number(request.headers.get('content-length')||'0')
 if(!Number.isFinite(contentLength)||contentLength>MAX_FILE_SIZE+2_000_000)return fail('Upload demasiado grande.',413)
 let path:string|null=null,uploaded=false
 try{
  const form=await request.formData(),file=form.get('file'),folderId=form.get('folderId'),classification=form.get('classification')
  if(!(file instanceof File)||typeof folderId!=='string'||typeof classification!=='string'||!VALID_ID.test(folderId))return fail('Ficheiro ou pasta inválida.',400)
  if(file.size>MAX_FILE_SIZE||file.size===0)return fail('Ficheiro demasiado grande ou vazio.',413)
  const blob=Buffer.from(await file.arrayBuffer())
  const info=parseFileUpload({name:file.name,mimeType:file.type,blob,folderId,classification})
  const db=getFirebaseAdminFirestore(),folder=await db.collection('area_doc_folders').doc(folderId).get()
  if(!folder.exists)return fail('Pasta não encontrada.',404)
  const teamId=folder.get('teamId')
  if(!canWriteTeam(actor,teamId))return fail('Sem permissão para carregar ficheiros nesta equipa.',403)
  const ref=db.collection('area_doc_files').doc(),stamp=new Date().toISOString()
  path=`private/documents/${ref.id}/v1`
  const version=nextDocumentVersion([],{blob,storagePath:path,actorUid:actor.uid,now:stamp})
  const bucket=privateDocumentBucket()
  await bucket.file(path).save(blob,{resumable:false,contentType:'application/octet-stream',preconditionOpts:{ifGenerationMatch:0}})
  uploaded=true
  const doc={teamId,folderId,classification:info.classification,mimeType:info.mimeType,latestVersion:1,revision:0,status:'active',dadosPrivados:sealDocumentName(info.name,ref.path),acl:buildDocumentAcl(teamId,actor.uid,info.classification),createdAt:stamp,createdBy:actor.uid,updatedAt:stamp,updatedBy:actor.uid}
  const audit=db.collection('area_doc_audit').doc()
  await db.runTransaction(async tx=>{
   tx.create(ref,doc)
   tx.create(ref.collection('versions').doc('000001'),version)
   tx.create(audit,{kind:'document-created',documentId:ref.id,actorUid:actor.uid,at:stamp,version:1})
  })
  uploaded=false
  return NextResponse.json({document:{id:ref.id,name:info.name,teamId,folderId,classification:info.classification,latestVersion:1}},{status:201})
 }catch(error){
  if(uploaded&&path)try{await privateDocumentBucket().file(path).delete({ignoreNotFound:true})}catch{}
  if(error instanceof DocumentWorkspaceError||error instanceof SyntaxError)return fail(error.message,400)
  return fail('Upload privado não concluído.',500)
 }
}
