import { auditedCreate } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,canWriteTeam,verifyMemberUids } from '@/lib/server/document-service'
import { parseDocumentTeam,DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'
export const runtime='nodejs'
export async function GET(request:Request){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 try{
  const db=getFirebaseAdminFirestore()
  const q=actor.admin?db.collection('area_doc_teams').limit(200):db.collection('area_doc_teams').where('memberUids','array-contains',actor.uid).limit(50)
  const docs=await q.get()
  return NextResponse.json({admin:actor.admin,teams:docs.docs.map(d=>({id:d.id,name:d.get('name'),memberUids:actor.admin?d.get('memberUids'):undefined,revision:d.get('revision'),permissions:{create:canWriteTeam(actor,d.id,'create'),update:canWriteTeam(actor,d.id,'update'),delete:canWriteTeam(actor,d.id,'delete')}}))})
 }catch{return NextResponse.json({error:'Não foi possível consultar equipas.'},{status:500})}
}
export async function POST(request:Request){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor?.admin)return NextResponse.json({error:'Apenas administradores criam equipas.'},{status:403})
 try{
  const input=parseDocumentTeam(await request.json())
  await verifyMemberUids(input.memberUids)
  const ref=getFirebaseAdminFirestore().collection('area_doc_teams').doc()
  const now=new Date().toISOString()
  await auditedCreate(ref,{...input,revision:1,createdAt:now,createdBy:actor.uid,updatedAt:now,updatedBy:actor.uid},{module:'document-teams',actorUid:actor.uid})
  return NextResponse.json({team:{id:ref.id,...input,revision:1}},{status:201})
 }catch(error){
  if(error instanceof DocumentWorkspaceError||error instanceof SyntaxError)return NextResponse.json({error:error.message},{status:400})
  return NextResponse.json({error:'Não foi possível criar a equipa. Verifica os utilizadores.'},{status:400})
 }
}
