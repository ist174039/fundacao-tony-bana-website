import test from 'node:test'
import assert from 'node:assert/strict'
import {validateAssessmentSemantics,transitionAssessment,AssessmentValidationError} from '../lib/server/social-assessment.mjs'
test('family household numbers must match',()=>{
 assert.throws(()=>validateAssessmentSemantics({pessoas:'4',adultos:'2',criancas:'1'}),AssessmentValidationError)
 assert.doesNotThrow(()=>validateAssessmentSemantics({pessoas:'4',adultos:'2',criancas:'2'}))
})
test('school absence reason is required',()=>{
 assert.throws(()=>validateAssessmentSemantics({criancas:'2',frequentaEscola:'Não'}),/razão/)
 assert.doesNotThrow(()=>validateAssessmentSemantics({criancas:'2',frequentaEscola:'Não',motivoFaltaEscola:'Distância'}))
})
test('assessment states cannot skip approval',()=>{
 assert.equal(transitionAssessment('rascunho','submetido',''),'submetido')
 assert.throws(()=>transitionAssessment('rascunho','aprovado','razão'),AssessmentValidationError)
 assert.throws(()=>transitionAssessment('em_analise','aprovado',''),AssessmentValidationError)
 assert.equal(transitionAssessment('em_analise','aprovado','Análise validada'),'aprovado')
})
