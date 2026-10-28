import test from 'node:test'
import assert from 'node:assert/strict'
import {FAMILY_ASSESSMENT_SECTIONS,FAMILY_FIELDS,parseFamilyAssessment,parseFamilyAssessmentSubmission,blankFamilyAssessment,FamilyAssessmentError} from '../lib/server/family-assessment.mjs'
const base={visitDate:'2026-10-28',volunteerName:'Avaliador de Teste',representativeName:'Representante Fictício'}
test('Questionnaire contains all 9 sections, including health and professional recommendation',()=>{
 assert.equal(FAMILY_ASSESSMENT_SECTIONS.length,9)
 assert.ok(FAMILY_FIELDS.some(f=>f.id==='chronicIllness'))
 assert.ok(FAMILY_FIELDS.some(f=>f.id==='foodShortage30Days'))
 assert.ok(FAMILY_FIELDS.some(f=>f.id==='recommendation'))
 assert.equal(blankFamilyAssessment().adultCount,'')
})
test('Draft may be incomplete; final recommendation requires justification',()=>{
 const payload={answers:base,status:'rascunho',expectedRevision:0,privacyBasisConfirmed:true}
 assert.equal(parseFamilyAssessmentSubmission(payload).status,'rascunho')
 assert.throws(()=>parseFamilyAssessmentSubmission({...payload,status:'concluida'}),FamilyAssessmentError)
 assert.equal(parseFamilyAssessmentSubmission({...payload,status:'concluida',answers:{...base,recommendation:'temporaria',justification:'Necessita de acompanhamento temporário.'}}).status,'concluida')
})
test('Rejects unknown fields, unbounded text, invalid dates, health disclosures outside whitelist',()=>{
 for(const answers of [{...base,role:'admin'},{...base,visitDate:'2026-02-30'},{...base,minorCount:-1},{...base,hasDisability:'talvez'},{...base,healthObservations:'x'.repeat(800)}])assert.throws(()=>parseFamilyAssessment(answers),FamilyAssessmentError)
})
test('Refuse empty actor/date and require privacy acknowledgement',()=>{
 assert.throws(()=>parseFamilyAssessmentSubmission({answers:base,status:'rascunho',expectedRevision:0}),FamilyAssessmentError)
 assert.throws(()=>parseFamilyAssessmentSubmission({answers:{...base,volunteerName:''},status:'rascunho',expectedRevision:0,privacyBasisConfirmed:true}),FamilyAssessmentError)
})
