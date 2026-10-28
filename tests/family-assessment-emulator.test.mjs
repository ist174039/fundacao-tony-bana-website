import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {initializeApp,deleteApp} from 'firebase-admin/app'
import {getFirestore} from 'firebase-admin/firestore'
import {saveFamilyAssessment,openFamilyAssessment} from '../lib/server/family-assessment-private.mjs'
import {decryptJson} from '../lib/server/field-encryption.mjs'

if(!['127.0.0.1:8080','localhost:8080'].includes(process.env.FIRESTORE_EMULATOR_HOST)||
 !/^demo-[a-z0-9-]+$/.test(process.env.GCLOUD_PROJECT||''))
 throw Error('Run only in the demo Firestore Emulator.')
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({familyEmu:randomBytes(32).toString('base64')})
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='familyEmu'
const seed=randomBytes(8).toString('hex'),app=initializeApp({projectId:process.env.GCLOUD_PROJECT},'ftb-family-'+seed),db=getFirestore(app)
const studentId=seed.repeat(4),student=db.collection('area_students').doc(studentId)
const answers={visitDate:'2026-10-28',volunteerName:'Voluntário Fictício',representativeName:'Família Fictícia',hasDisability:'sim',healthObservations:'Dado fictício sensível'}
const payload=(expectedRevision,extra={})=>({answers:{...answers,...extra},status:'rascunho',expectedRevision,privacyBasisConfirmed:true})
test('Family assessment is separately encrypted, versioned, audited and conflict safe',async()=>{
 await student.create({estado:'ativo',escolaCodigo:'ESC-001'})
 assert.deepEqual(await saveFamilyAssessment(db,studentId,'admin-fixture',payload(0),'2026-10-28T10:00:00Z'),{status:'saved',revision:1})
 const ref=db.collection('area_student_family_assessments').doc(studentId)
 const v1=await ref.collection('revisions').doc('000001').get()
 const raw=(await ref.get()).data()
 assert.equal(raw.revision,1)
 for(const s of ['Voluntário Fictício','Família Fictícia','Dado fictício sensível','hasDisability'])
   assert.equal(JSON.stringify(raw).includes(s),false)
 assert.equal(openFamilyAssessment(raw,ref.path).answers.representativeName,'Família Fictícia')
 assert.equal(decryptJson(v1.data().dadosPrivados,v1.ref.path+'#family-assessment-v1').hasDisability,'sim')
 assert.deepEqual(await saveFamilyAssessment(db,studentId,'another-admin',payload(0),'2026-10-28T11:00:00Z'),{status:'conflict',revision:1})
 assert.deepEqual(await saveFamilyAssessment(db,studentId,'admin-fixture',payload(1,{representativeName:'Segunda versão'}),'2026-10-28T11:00:00Z'),{status:'saved',revision:2})
 const original=await ref.collection('revisions').doc('000001').get()
 assert.equal(openFamilyAssessment(original.data(),original.ref.path).answers.representativeName,'Família Fictícia')
 assert.equal(openFamilyAssessment((await ref.get()).data(),ref.path).answers.representativeName,'Segunda versão')
 const audit=await db.collection('area_audit_events').where('recordPath','==',ref.path).get()
 assert.equal(audit.size,2)
 assert.deepEqual(audit.docs.map(d=>d.get('action')).sort(),['create','update'])
 assert.ok(audit.docs.every(d=>d.get('snapshotProtected')===true&&d.get('actorUid')==='admin-fixture'))
 assert.equal((await student.get()).get('estado'),'ativo')
})
test('Missing student prevents creation of a family assessment',async()=>{
 const noStudent='a'.repeat(64)
 assert.deepEqual(await saveFamilyAssessment(db,noStudent,'admin-fixture',payload(0)),{status:'not-found'})
})
test.after(async()=>{await deleteApp(app)})
