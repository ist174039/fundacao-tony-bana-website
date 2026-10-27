import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,canOperateDocument,privateDocumentBucket } from '@/lib/server/document-service'
import { VALID_ID,openDocumentName } from '@/lib/server/document-workspace.mjs'
export const runtime='nodejs'
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!VALID_ID.test(params.id))return NextResponse.json({error:'Documento inválido.'},{status:400})
 try{
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(params.id),doc=await ref.get()
  if(!doc.exists||!canOperateDocument(actor,doc.data()!,'read'))return NextResponse.json({error:'Documento não encontrado ou sem acesso.'},{status:404})
  const url=new URL(request.url),q=url.searchParams.get('version')
  const version=q?Number(q):doc.get('latestVersion')
  if(!Number.isInteger(version)||version<1||version>50||version>doc.get('latestVersion'))return NextResponse.json({error:'Versão inválida.'},{status:400})
  const versionDoc=await ref.collection('versions').doc(String(version).padStart(6,'0')).get()
  if(!versionDoc.exists||versionDoc.get('storagePath')!==`private/documents/${params.id}/v${version}`)return NextResponse.json({error:'Versão não encontrada.'},{status:404})
  const [content]=await privateDocumentBucket().file(versionDoc.get('storagePath')).download()
  const name=openDocumentName(doc.data(),ref.path)
  const audit=db.collection('area_doc_audit').doc()
  await audit.create({kind:'document-downloaded',documentId:params.id,version,actorUid:actor.uid,at:new Date().toISOString()})
  return new NextResponse(new Uint8Array(content),{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(name)}`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
 }catch{return NextResponse.json({error:'Não foi possível descarregar o documento.'},{status:500})}
}
