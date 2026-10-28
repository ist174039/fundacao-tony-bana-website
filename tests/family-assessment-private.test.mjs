import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {sealFamilyAssessment,openFamilyAssessment,familyRevisionId,STUDENT_ID} from '../lib/server/family-assessment-private.mjs'
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({familyTest:randomBytes(32).toString('base64')})
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='familyTest'
const studentId='a'.repeat(64),path='area_student_family_assessments/'+studentId
const record={studentId,revision:1,status:'rascunho',updatedAt:'2026-10-28',updatedBy:'admin-fake',createdAt:'2026-10-28',createdBy:'admin-fake',answers:{representativeName:'Nome Privado',hasDisability:'sim',healthObservations:'Informação protegida'}}
test('Assessment does not expose identity, disability or health observations in plaintext',()=>{
 const safe=sealFamilyAssessment(record,path)
 for(const sensitive of ['Nome Privado','Informação protegida','hasDisability']) assert.equal(JSON.stringify(safe).includes(sensitive),false)
 assert.equal(openFamilyAssessment(safe,path).answers.representativeName,'Nome Privado')
 assert.throws(()=>openFamilyAssessment(safe,path+'-another-student'))
 assert.equal(STUDENT_ID.test(studentId),true)
 assert.equal(familyRevisionId(12),'000012')
})
