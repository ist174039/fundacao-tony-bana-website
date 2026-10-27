import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,verifyMemberUids } from '@/lib/server/document-service'
import { parseDocumentTeam,VALID_ID,DocumentWorkspaceError } from '@/lib/server/document-workspace.mjs'
export const runtime='nodejs'
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor?.admin)return NextResponse.json({error:'Sem permissão para alterar a equipa.'},{status:403})
 if(!VALID_ID.test(params.id))return NextResponse.json({error:'Equipa inválida.'},{status:400})
 try{
  const raw=await request.json()
  const team=parseDocumentTeam(raw)
  const expectedRevision=raw.expectedRevision
  if(!Number.isInteger(expectedRevision)||expectedRevision<1)return NextResponse.json({error:'Revisão inválida.'},{status:400})
  await verifyMemberUids(team.memberUids)
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_teams').doc(params.id),audit=db.collection('area_doc_audit').doc()
  const outcome=await db.runTransaction(async tx=>{
   const doc=await tx.get(ref)
   if(!doc.exists)return 'missing'
   if(doc.get('revision')!==expectedRevision)return 'conflict'
   const updated={...team,revision:expectedRevision+1,updatedBy:actor.uid,updatedAt:new Date().toISOString()}
   tx.update(ref,updated)
   appendAuditEvent(tx,db,{module:'document-teams',action:'update',recordPath:ref.path,actorUid:actor.uid,before:doc.data(),after:{...doc.data(),...updated}})
   tx.create(audit,{kind:'team-members-updated',teamId:ref.id,actorUid:actor.uid,at:new Date().toISOString()})
   return 'updated'
  })
  if(outcome==='missing')return NextResponse.json({error:'Equipa inexistente.'},{status:404})
  if(outcome==='conflict')return NextResponse.json({error:'A equipa mudou. Atualiza e tenta novamente.'},{status:409})
  return NextResponse.json({success:true,revision:expectedRevision+1})
 }catch(e){if(e instanceof DocumentWorkspaceError||e instanceof SyntaxError)return NextResponse.json({error:e.message},{status:400});return NextResponse.json({error:'Não foi possível atualizar a equipa.'},{status:500})}
}
