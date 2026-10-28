import {NextResponse} from 'next/server'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {FamilyAssessmentError} from '@/lib/server/family-assessment.mjs'
import {STUDENT_ID,openFamilyAssessment,saveFamilyAssessment,familyRevisionId} from '@/lib/server/family-assessment-private.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
async function authorize(request:Request,id:string){
 if(!STUDENT_ID.test(id))return {error:fail('Identificador de aluno inválido.',400),actor:null}
 if(!(await isOperationalModuleEnabled('students'))||process.env.FTB_FAMILY_ASSESSMENTS_ENABLED!=='true')
  return {error:fail('Avaliação familiar indisponível: ativação técnica ou operacional em falta.',503),actor:null}
 if(!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())
  return {error:fail('Serviço de dados cifrados indisponível.',503),actor:null}
 const actor=await requireAreaAdmin(request)
 if(!actor)return {error:fail('Sem permissão para consultar avaliações familiares.',403),actor:null}
 return {error:null,actor}
}
export async function GET(request:Request,{params}:{params:{id:string}}){
 const {error}=await authorize(request,params.id)
 if(error)return error
 try{
  const db=getFirebaseAdminFirestore()
  const student=await db.collection('area_students').doc(params.id).get()
  if(!student.exists)return fail('Aluno não encontrado.',404)
  const ref=db.collection('area_student_family_assessments').doc(params.id),current=await ref.get()
  if(!current.exists)return NextResponse.json({avaliacao:null,revisoes:[],currentRevision:0},{headers:{'Cache-Control':'no-store'}})
  const latest=current.get('revision')
  if(!Number.isSafeInteger(latest)||latest<1)return fail('Histórico inconsistente.',500)
  const history=await ref.collection('revisions').orderBy('revision','desc').limit(50).get()
  const revisions=history.docs.map(d=>({revision:d.get('revision'),status:d.get('status'),updatedAt:d.get('updatedAt'),updatedBy:d.get('updatedBy')}))
  const requested=new URL(request.url).searchParams.get('revision')
  let selected=current
  if(requested!==null){
   if(!/^[1-9]\d{0,5}$/.test(requested)||Number(requested)>latest)return fail('Revisão inválida.',400)
   selected=await ref.collection('revisions').doc(familyRevisionId(Number(requested))).get()
   if(!selected.exists)return fail('Revisão não encontrada.',404)
  }
  return NextResponse.json({avaliacao:openFamilyAssessment(selected.data(),selected.ref.path),revisoes:revisions,currentRevision:latest},{headers:{'Cache-Control':'no-store'}})
 }catch{return fail('Não foi possível consultar a avaliação familiar.',500)}
}
export async function PUT(request:Request,{params}:{params:{id:string}}){
 const {error,actor}=await authorize(request,params.id)
 if(error)return error
 try{
  const raw=await request.json()
  const result=await saveFamilyAssessment(getFirebaseAdminFirestore(),params.id,actor!.uid,raw)
  if(result.status==='not-found')return fail('Aluno não encontrado.',404)
  if(result.status==='conflict')return NextResponse.json({error:'A avaliação foi alterada por outra pessoa. Recarrega a ficha antes de guardar.',revision:result.revision},{status:409,headers:{'Cache-Control':'no-store'}})
  return NextResponse.json({success:true,revision:result.revision},{headers:{'Cache-Control':'no-store'}})
 }catch(e){
  if(e instanceof FamilyAssessmentError||e instanceof SyntaxError)return fail(e.message,400)
  return fail('Não foi possível guardar a avaliação.',500)
 }
}
