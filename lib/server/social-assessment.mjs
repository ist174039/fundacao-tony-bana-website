export class AssessmentValidationError extends Error {}
const yesNo=new Set(['','Sim','Não'])
const enums={
 idosos:yesNo,deficiencia:yesNo,frequentaEscola:yesNo,doencaCronica:yesNo,tratamentoEspecializado:yesNo,medicacaoContinua:yesNo,casaBanho:yesNo,aguaPotavel:yesNo,eletricidade:yesNo,
 faltaAlimentos:new Set(['','Nunca','Às vezes','Frequentemente']),
 situacaoGeral:new Set(['','Estável','Vulnerável','Crítica']),
 recomendacao:new Set(['','Assistência Permanente','Assistência Temporária','Encaminhamento para Formação/Emprego','Microcrédito','Não Elegível'])
}
export function validateAssessmentSemantics(v){
 if(!v||typeof v!=='object'||Array.isArray(v))throw new AssessmentValidationError('Avaliação inválida.')
 for(const [k,allowed] of Object.entries(enums))if(!allowed.has(v[k]||''))throw new AssessmentValidationError('Opção inválida: '+k)
 for(const k of ['pessoas','adultos','criancas'])if(v[k]!==''&&v[k]!==undefined&&(!/^\d+$/.test(v[k])||Number(v[k])>100))throw new AssessmentValidationError('Quantidade inválida: '+k)
 const count=k=>v[k]!==''&&v[k]!==undefined?Number(v[k]):null
 if(count('pessoas')!==null&&count('adultos')!==null&&count('criancas')!==null&&count('adultos')+count('criancas')!==count('pessoas'))throw new AssessmentValidationError('Total de pessoas deve corresponder a adultos + crianças.')
 if(count('criancas')===0&&v.frequentaEscola==='Não')throw new AssessmentValidationError('Não existem crianças para justificar ausência escolar.')
 if(v.frequentaEscola==='Não'&&!String(v.motivoFaltaEscola||'').trim())throw new AssessmentValidationError('Indica a razão da ausência escolar.')
 if(v.recomendacao==='Não Elegível'&&!(v.justificacao||'').trim())throw new AssessmentValidationError('Indica a justificação de não elegibilidade.')
 if(v.dataVisita&&(!/^20\d{2}-\d{2}-\d{2}$/.test(v.dataVisita)||new Date(v.dataVisita+'T12:00:00Z').toISOString().slice(0,10)!==v.dataVisita))throw new AssessmentValidationError('Data de visita inválida.')
 return v
}
export const transitions={
 rascunho:['submetido'],
 submetido:['em_analise','rascunho'],
 em_analise:['aprovado','recusado','rascunho'],
 aprovado:['concluido'],
 recusado:[],
 concluido:[]
}
export function transitionAssessment(status,next,reason){
 if(!transitions[status]?.includes(next))throw new AssessmentValidationError('Transição de estado não permitida.')
 if(['aprovado','recusado'].includes(next)&&!String(reason||'').trim())throw new AssessmentValidationError('Justificação da decisão obrigatória.')
 return next
}
