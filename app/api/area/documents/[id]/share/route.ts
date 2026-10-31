import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { resolveDocumentActor,documentFeatureReady,verifyMemberUids } from '@/lib/server/document-service'
import { VALID_ID,sanitizeShareAcl } from '@/lib/server/document-workspace.mjs'
import { DocumentPolicyError } from '@/lib/server/document-library.mjs'
export const runtime='nodejs'
export async function PUT(request:Request,{params}:{params:{id:string}}){
 if(!documentFeatureReady())return NextResponse.json({error:'Documentos indisponíveis.'},{status:503})
 const actor=await resolveDocumentActor(request)
 if(!actor?.admin)return NextResponse.json({error:'A partilha é gerida por administradores.'},{status:403})
 if(!VALID_ID.test(params.id))return NextResponse.json({error:'Documento inválido.'},{status:400})
 try{
  const raw=await request.json()
  if(!raw||typeof raw!=='object'||!Number.isInteger(raw.expectedRevision)||raw.expectedRevision<0)return NextResponse.json({error:'Pedido inválido.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_doc_files').doc(params.id),doc=await ref.get()
  if(!doc.exists)return NextResponse.json({error:'Documento não encontrado.'},{status:404})
  if(doc.get('status')==='archived')return NextResponse.json({error:'Documento arquivado.'},{status:409})
  const acl=sanitizeShareAcl(raw.acl,doc.data())
  const team=await db.collection('area_doc_teams').doc(doc.get('teamId')).get()
  if(!team.exists)return NextResponse.json({error:'Equipa inexistente.'},{status:409})
  if(acl.userUids.some(uid=>uid!==doc.get('createdBy')&&!team.get('memberUids')?.includes(uid)))return NextResponse.json({error:'Só é possível partilhar com membros da equipa.'},{status:422})
  await verifyMemberUids(acl.userUids)
  const audit=db.collection('area_doc_audit').doc()
  const changed=await db.runTransaction(async tx=>{
   const current=await tx.get(ref)
   if(!current.exists||current.get('status')==='archived'||Number(current.get('revision')||0)!==raw.expectedRevision)return false
   const updated={acl,revision:raw.expectedRevision+1,updatedAt:new Date().toISOString(),updatedBy:actor.uid}
   tx.update(ref,updated)
   appendAuditEvent(tx,db,{module:'documents',action:'share',recordPath:ref.path,actorUid:actor.uid,before:current.data(),after:{...current.data(),...updated}})
   tx.create(audit,{kind:'document-sharing-updated',documentId:ref.id,actorUid:actor.uid,at:new Date().toISOString(),revision:raw.expectedRevision+1})
   return true
  })
  if(!changed)return NextResponse.json({error:'Partilha alterada por outra pessoa. Atualiza.'},{status:409})
  return NextResponse.json({success:true,revision:raw.expectedRevision+1})
 }catch(e){if(e instanceof DocumentPolicyError||e instanceof SyntaxError)return NextResponse.json({error:e.message},{status:400});return NextResponse.json({error:'Não foi possível atualizar a partilha.'},{status:500})}
}
