/**
 * FTB-FAM-001: Family assessment based on the supplied four-page questionnaire.
 * Form fields are optional except visit date and evaluator; conclusions require
 * a recorded recommendation and justification. No automatic eligibility scoring.
 * Never log response bodies, store answers outside encrypted envelopes, or index PII.
 */
export class FamilyAssessmentError extends Error {
  constructor(message){super(message);this.name='FamilyAssessmentError'}
}
const opts=(values)=>Object.freeze(values.map(([value,label])=>Object.freeze({value,label})))
const yesNo=opts([['sim','Sim'],['nao','Não'],['nao_informado','Não informado']])
export const FAMILY_ASSESSMENT_SECTIONS=Object.freeze([
 {id:'identificacao',title:'A. Identificação da família',fields:[
  {id:'visitDate',label:'Data da visita',kind:'date'},
  {id:'volunteerName',label:'Nome do voluntário / avaliador',kind:'text',max:140},
  {id:'representativeName',label:'Representante da família',kind:'text',max:140},
  {id:'community',label:'Comunidade',kind:'text',max:120},
  {id:'familyPhone',label:'Telefone',kind:'text',max:40},
 ]},
 {id:'composicao',title:'B. Composição familiar',fields:[
  {id:'householdSize',label:'Pessoas na residência',kind:'select',options:opts([['1','1 pessoa'],['2-3','2 a 3'],['4-5','4 a 5'],['6-7','6 a 7'],['8+','8 ou mais']])},
  {id:'adultCount',label:'Número de adultos',kind:'count'},
  {id:'minorCount',label:'Número de menores (0–17)',kind:'count'},
  {id:'hasElderly',label:'Há pessoas com 65 anos ou mais?',kind:'select',options:yesNo},
  {id:'hasDisability',label:'Há alguma pessoa com deficiência?',kind:'select',options:yesNo},
 ]},
 {id:'educacao',title:'C. Educação',fields:[
  {id:'allChildrenAttendSchool',label:'Todas as crianças frequentam a escola?',kind:'select',options:yesNo},
  {id:'schoolAbsenceReason',label:'Se não, qual o motivo?',kind:'textarea',max:700},
 ]},
 {id:'saude',title:'D. Saúde (dados especialmente sensíveis)',fields:[
  {id:'chronicIllness',label:'Algum membro tem doença crónica?',kind:'select',options:yesNo},
  {id:'needsSpecializedTreatment',label:'Alguém necessita de tratamento especializado?',kind:'select',options:yesNo},
  {id:'continuousMedication',label:'Existe uso contínuo de medicamentos?',kind:'select',options:yesNo},
  {id:'healthObservations',label:'Observações de saúde (apenas as necessárias)',kind:'textarea',max:700},
 ]},
 {id:'rendimento',title:'E. Trabalho e rendimento',fields:[
  {id:'paidWorkers',label:'Pessoas com trabalho remunerado',kind:'select',options:opts([['0','Nenhuma'],['1','1 pessoa'],['2','2 pessoas'],['3+','3 ou mais']])},
  {id:'incomeSource',label:'Principal fonte de rendimento',kind:'select',options:opts([['formal','Emprego formal'],['informal','Biscate / informal'],['agricultura','Agricultura'],['apoio','Apoio social'],['sem','Sem rendimento']])},
  {id:'incomeLevel',label:'Rendimento familiar mensal (faixa)',kind:'select',options:opts([['sem','Sem rendimento'],['baixo','Baixo'],['medio','Médio'],['alto','Alto']])},
 ]},
 {id:'alimentacao',title:'F. Alimentação',fields:[
  {id:'dailyMeals',label:'Refeições por dia',kind:'select',options:opts([['0-1','0 a 1'],['2','2'],['3+','3 ou mais']])},
  {id:'foodShortage30Days',label:'Faltou alimento nos últimos 30 dias?',kind:'select',options:opts([['nunca','Nunca'],['vezes','Às vezes'],['frequente','Frequentemente']])},
 ]},
 {id:'habitacao',title:'G. Habitação',fields:[
  {id:'housingStatus',label:'Situação da moradia',kind:'select',options:opts([['propria','Própria'],['arrendada','Arrendada'],['cedida','Cedida']])},
  {id:'housingMaterial',label:'Material predominante',kind:'select',options:opts([['alvenaria','Alvenaria'],['chapa','Chapa'],['outro','Outro']])},
  {id:'housingMaterialOther',label:'Outro material',kind:'text',max:120},
  {id:'hasBathroom',label:'Casa de banho?',kind:'select',options:yesNo},
  {id:'hasPotableWater',label:'Água potável?',kind:'select',options:yesNo},
  {id:'hasElectricity',label:'Eletricidade?',kind:'select',options:yesNo},
 ]},
 {id:'observacao',title:'H. Observação do voluntário',fields:[
  {id:'housingCondition',label:'Condições da habitação',kind:'select',options:opts([['boa','Boa'],['regular','Regular'],['precaria','Precária']])},
  {id:'hygieneCondition',label:'Condições de higiene',kind:'select',options:opts([['boa','Boa'],['regular','Regular'],['ma','Más']])},
  {id:'generalSituation',label:'Situação observada',kind:'select',options:opts([['estavel','Estável'],['vulneravel','Vulnerável'],['critica','Crítica']])},
  {id:'volunteerObservations',label:'Notas de observação',kind:'textarea',max:1200},
 ]},
 {id:'recomendacao',title:'I. Recomendação da avaliação',fields:[
  {id:'recommendation',label:'Recomendação (parecer, não decisão automática)',kind:'select',options:opts([['permanente','Assistência permanente'],['temporaria','Assistência temporária'],['formacao','Formação / emprego'],['microcredito','Microcrédito'],['nao_elegivel','Não elegível']])},
  {id:'justification',label:'Justificação',kind:'textarea',max:1200},
  {id:'generalObservations',label:'Observações gerais',kind:'textarea',max:1200},
 ]},
]);
export const FAMILY_FIELDS=Object.freeze(FAMILY_ASSESSMENT_SECTIONS.flatMap(x=>x.fields))
const dict=new Map(FAMILY_FIELDS.map(x=>[x.id,x]))
const isoDate=(d)=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&Number.isFinite(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d&&d<='2099-12-31'
export function blankFamilyAssessment(){return Object.fromEntries(FAMILY_FIELDS.map(f=>[f.id,'']))}
export function parseFamilyAssessment(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!dict.has(k)))throw new FamilyAssessmentError('Campos da avaliação não autorizados.')
 const result=blankFamilyAssessment()
 for(const [name,value] of Object.entries(raw)){
  const field=dict.get(name)
  if(field.kind==='count'){
    if(value===''||value===null){result[name]='';continue}
    if(!Number.isSafeInteger(value)||value<0||value>99)throw new FamilyAssessmentError(field.label+': número inválido.')
    result[name]=value;continue
  }
  if(typeof value!=='string')throw new FamilyAssessmentError(field.label+': valor inválido.')
  const txt=value.trim()
  if(field.kind==='date'&&txt&&!isoDate(txt))throw new FamilyAssessmentError(field.label+': data inválida.')
  if(field.kind==='select'&&txt&&!field.options.some(o=>o.value===txt))throw new FamilyAssessmentError(field.label+': escolha inválida.')
  if(['text','textarea'].includes(field.kind)&&(txt.length>(field.max||200)||/[\u0000-\u0008\u000B-\u001F]/.test(txt)))throw new FamilyAssessmentError(field.label+': texto inválido.')
  result[name]=txt
 }
 return result
}
export function parseFamilyAssessmentSubmission(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['answers','status','expectedRevision','privacyBasisConfirmed'].includes(k)))
  throw new FamilyAssessmentError('Submissão de avaliação inválida.')
 if(!Number.isSafeInteger(raw.expectedRevision)||raw.expectedRevision<0||raw.expectedRevision>100000)throw new FamilyAssessmentError('Revisão inválida.')
 if(!['rascunho','concluida'].includes(raw.status))throw new FamilyAssessmentError('Estado inválido.')
 if(raw.privacyBasisConfirmed!==true)throw new FamilyAssessmentError('Confirma a base legal e a necessidade de recolha destes dados antes de guardar.')
 const answers=parseFamilyAssessment(raw.answers)
 if(!answers.visitDate||!answers.volunteerName)throw new FamilyAssessmentError('Indica data e avaliador.')
 if(raw.status==='concluida'&&(!answers.recommendation||answers.justification.length<10))
  throw new FamilyAssessmentError('Uma avaliação concluída exige recomendação e justificação com pelo menos 10 caracteres.')
 return {answers,status:raw.status,expectedRevision:raw.expectedRevision}
}
