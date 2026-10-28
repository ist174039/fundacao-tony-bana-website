import {operationalActor,permittedSchool} from '@/lib/server/operational-authorization'
import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { encryptJson, decryptJson, isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { validateAssessmentSemantics, AssessmentValidationError } from '@/lib/server/social-assessment.mjs'
import { appendAuditEvent } from '@/lib/server/audit-log.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const studentId = /^[a-f0-9]{64}$/
const fields = ['dataVisita','voluntario','voluntarioUid','representante','comunidade','telefone','pessoas','adultos','criancas','idosos','deficiencia','frequentaEscola','motivoFaltaEscola','doencaCronica','tratamentoEspecializado','medicacaoContinua','observacoesSaude','pessoasEmpregadas','fonteRendimento','nivelRendimento','refeicoesDia','faltaAlimentos','tipoMoradia','materialConstrucao','casaBanho','aguaPotavel','eletricidade','condicaoHabitacao','higiene','situacaoGeral','recomendacao','justificacao','observacoesGerais'] as const
function validate(value: unknown) {
 if(!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Ficha inválida.')
 const raw=value as Record<string,unknown>, result:Record<string,string>={}
 if(Object.keys(raw).some(key=>!fields.includes(key as typeof fields[number]))) throw new Error('Campo não reconhecido.')
 for(const field of fields){
  const item=raw[field]??''
  if(typeof item!=='string' || item.length>1500 || /[\u0000-\u001f]/.test(item)) throw new Error('Valor inválido: '+field)
  result[field]=item.trim()
 }
 if(!result.dataVisita || !/^20\d{2}-\d{2}-\d{2}$/.test(result.dataVisita) || Number.isNaN(Date.parse(result.dataVisita))) throw new Error('Indica a data da avaliação.')
 if(!result.representante || !result.voluntarioUid) throw new Error('Indica o representante e seleciona o voluntário.')
 return result
}
async function authorize(request:Request,id:string,action:'read'|'update') {
 if(!(await isOperationalModuleEnabled('students')) || process.env.FTB_STUDENTS_ENABLED!=='true' || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return {error:NextResponse.json({error:'Módulo indisponível.'},{status:503})}
 if(!studentId.test(id))return {error:NextResponse.json({error:'Aluno inválido.'},{status:400})}
 const student=await getFirebaseAdminFirestore().collection('area_students').doc(id).get()
 if(!student.exists)return {error:NextResponse.json({error:'Aluno não encontrado.'},{status:404})}
 const admin=await operationalActor(request,'assessments',action,student.get('escolaCodigo'))
 if(!admin)return {error:NextResponse.json({error:'Sem permissão para esta avaliação.'},{status:403})}
 return {admin}
}
export async function GET(request:Request,{params}:{params:{id:string}}){
 const access=await authorize(request,params.id,'read');if('error' in access)return access.error
 const db=getFirebaseAdminFirestore(),student=db.collection('area_students').doc(params.id)
 try {
  if(!(await student.get()).exists)return NextResponse.json({error:'Aluno não encontrado.'},{status:404})
  const ref=db.collection('area_family_assessments').doc(params.id),snapshot=await ref.get()
  if(!snapshot.exists)return NextResponse.json({avaliacao:null},{headers:{'Cache-Control':'private, no-store'}})
  const data=snapshot.data()!
  return NextResponse.json({avaliacao:{...decryptJson(data.dadosPrivados,ref.path+'#family-assessment-v1'),atualizadoEm:data.atualizadoEm,atualizadoPor:data.atualizadoPor,estado:data.estado||'rascunho'}},{headers:{'Cache-Control':'private, no-store'}})
 } catch {return NextResponse.json({error:'Não foi possível consultar a avaliação.'},{status:500})}
}
export async function PUT(request:Request,{params}:{params:{id:string}}){
 const access=await authorize(request,params.id,'update');if('error' in access)return access.error
 try {
  const value=validateAssessmentSemantics(validate(await request.json())),db=getFirebaseAdminFirestore(),student=db.collection('area_students').doc(params.id),ref=db.collection('area_family_assessments').doc(params.id)
  let volunteer
  try { volunteer=await getFirebaseAdminAuth().getUser(value.voluntarioUid) } catch { return NextResponse.json({error:'O voluntário selecionado não existe.'},{status:422}) }
  if(volunteer.disabled)return NextResponse.json({error:'O utilizador selecionado está desativado.'},{status:422})
  value.voluntario=(volunteer.displayName||volunteer.email||'Utilizador sem nome').trim()
  const result=await db.runTransaction(async tx=>{
   const [studentSnap,previous]=await Promise.all([tx.get(student),tx.get(ref)])
   if(!studentSnap.exists)return 'missing'
   const stamp=new Date().toISOString(),data={estado:'rascunho',dadosPrivados:encryptJson(value,ref.path+'#family-assessment-v1'),alunoId:params.id,atualizadoEm:stamp,atualizadoPor:access.admin!.uid,...(!previous.exists?{criadoEm:stamp,criadoPor:access.admin!.uid}:{})}
   if(previous.exists&&previous.get('estado')!=='rascunho')return 'locked'
   if(previous.exists)tx.update(ref,data);else tx.create(ref,data)
   appendAuditEvent(tx,db,{module:'family-assessments',action:previous.exists?'update':'create',recordPath:ref.path,actorUid:access.admin!.uid,before:previous.exists?previous.data():null,after:data,at:stamp})
   return 'saved'
  })
  if(result==='locked')return NextResponse.json({error:'Avaliação submetida não pode ser alterada. Cria uma nova visita.'},{status:409})
  if(result==='missing')return NextResponse.json({error:'Aluno não encontrado.'},{status:404})
  return NextResponse.json({success:true})
 }catch(e){if(e instanceof SyntaxError || e instanceof AssessmentValidationError || (e instanceof Error && (e.message.startsWith('Campo')||e.message.startsWith('Valor')||e.message.startsWith('Ficha')||e.message.startsWith('Indica'))))return NextResponse.json({error:(e as Error).message},{status:400});return NextResponse.json({error:'Não foi possível guardar a avaliação.'},{status:500})}
}
