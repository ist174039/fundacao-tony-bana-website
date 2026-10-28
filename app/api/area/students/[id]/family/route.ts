import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export async function PUT(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Registos indisponíveis.'},{status:503})
 const actor=await requireAreaAdmin(request)
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[a-f0-9]{64}$/.test(params.id))return NextResponse.json({error:'Aluno inválido.'},{status:400})
 try{
  const body=await request.json(),familyId=body?.familyId
  if(typeof familyId!=='string'||!/^[A-Za-z0-9]{12,40}$/.test(familyId))return NextResponse.json({error:'Família inválida.'},{status:400})
  const db=getFirebaseAdminFirestore(),student=db.collection('area_students').doc(params.id),family=db.collection('area_families').doc(familyId),link=db.collection('area_family_student_links').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const [studentDoc,familyDoc,previous]=await Promise.all([tx.get(student),tx.get(family),tx.get(link)])
   if(!studentDoc.exists||!familyDoc.exists)return 'missing'
   const old=previous.exists?previous.get('familyId'):null
   if(old&&old!==familyId)return 'conflict'
   if(old===familyId)return 'unchanged'
   const at=new Date().toISOString(),data={studentId:params.id,familyId,createdAt:at,createdBy:actor.uid}
   tx.create(link,data)
   appendAuditEvent(tx,db,{module:'family-links',action:'create',recordPath:link.path,actorUid:actor.uid,after:data,at})
   return 'linked'
  })
  if(result==='missing')return NextResponse.json({error:'Aluno ou família inexistente.'},{status:404})
  if(result==='conflict')return NextResponse.json({error:'O aluno já pertence a outra família. Transferência exige processo validado.'},{status:409})
  return NextResponse.json({status:result})
 }catch{return NextResponse.json({error:'Não foi possível associar o aluno.'},{status:500})}
}
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured())return NextResponse.json({error:'Registos indisponíveis.'},{status:503})
 if(!(await requireAreaAdmin(request)))return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[a-f0-9]{64}$/.test(params.id))return NextResponse.json({error:'Aluno inválido.'},{status:400})
 try{
  const doc=await getFirebaseAdminFirestore().collection('area_family_student_links').doc(params.id).get()
  return NextResponse.json({familyId:doc.exists?doc.get('familyId'):null},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Falha ao consultar família.'},{status:500})}
}
