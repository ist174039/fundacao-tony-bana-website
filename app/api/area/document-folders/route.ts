import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,canReadTeam,canWriteTeam } from '@/lib/server/document-service'
import { parseDocumentFolder, DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'
export const runtime='nodejs'
export async function GET(request:Request){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 try{
  const list=await getFirebaseAdminFirestore().collection('area_doc_folders').limit(300).get()
  return NextResponse.json({folders:list.docs.filter(d=>canReadTeam(actor,d.get('teamId'))).map(d=>({id:d.id,name:d.get('name'),teamId:d.get('teamId'),parentId:d.get('parentId')}))})
 }catch{return NextResponse.json({error:'Não foi possível consultar pastas.'},{status:500})}
}
export async function POST(request:Request){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 try{
  const input=parseDocumentFolder(await request.json()),db=getFirebaseAdminFirestore()
  if(!canWriteTeam(actor,input.teamId))return NextResponse.json({error:'Sem permissão na equipa.'},{status:403})
  const team=await db.collection('area_doc_teams').doc(input.teamId).get()
  if(!team.exists)return NextResponse.json({error:'Equipa inexistente.'},{status:404})
  if(input.parentId){
   const parent=await db.collection('area_doc_folders').doc(input.parentId).get()
   if(!parent.exists||parent.get('teamId')!==input.teamId)return NextResponse.json({error:'Pasta de origem inválida.'},{status:422})
  }
  const ref=db.collection('area_doc_folders').doc(),now=new Date().toISOString()
  await ref.create({...input,createdAt:now,createdBy:actor.uid})
  return NextResponse.json({folder:{id:ref.id,...input}},{status:201})
 }catch(e){if(e instanceof DocumentWorkspaceError||e instanceof SyntaxError)return NextResponse.json({error:e.message},{status:400});return NextResponse.json({error:'Não foi possível criar pasta.'},{status:500})}
}
