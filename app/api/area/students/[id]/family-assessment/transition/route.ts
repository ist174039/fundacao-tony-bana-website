import {NextResponse} from 'next/server'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
import {transitionAssessment,AssessmentValidationError} from '@/lib/server/social-assessment.mjs'
export const runtime='nodejs'
export async function POST(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Avaliações indisponíveis.'},{status:503})
 const admin=await requireAreaAdmin(request)
 if(!admin)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[a-f0-9]{64}$/.test(params.id))return NextResponse.json({error:'Aluno inválido.'},{status:400})
 try{
  const body=await request.json()
  if(typeof body?.next!=='string'||typeof body?.reason!=='string'||body.reason.length>1000)return NextResponse.json({error:'Pedido inválido.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_family_assessments').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const before=await tx.get(ref)
   if(!before.exists)return 'missing'
   const current=before.get('estado')||'rascunho'
   const next=transitionAssessment(current,body.next,body.reason)
   const stamp=new Date().toISOString(),change={estado:next,decisaoJustificacao:body.reason.trim(),decididoPor:admin.uid,atualizadoEm:stamp}
   tx.update(ref,change)
   appendAuditEvent(tx,db,{module:'family-assessments',action:'update',recordPath:ref.path,actorUid:admin.uid,before:before.data(),after:{...before.data(),...change},at:stamp})
   const event=db.collection('area_assessment_events').doc()
   tx.create(event,{assessmentId:ref.id,previousState:current,nextState:next,reason:body.reason.trim(),actorUid:admin.uid,at:stamp})
   return next
  })
  return result==='missing'?NextResponse.json({error:'Avaliação não encontrada.'},{status:404}):NextResponse.json({estado:result})
 }catch(e){return e instanceof AssessmentValidationError?NextResponse.json({error:e.message},{status:409}):NextResponse.json({error:'Não foi possível alterar o estado.'},{status:500})}
}
