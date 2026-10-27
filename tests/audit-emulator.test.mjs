import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { initializeApp,deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp as initializeClient,deleteApp as deleteClient } from 'firebase/app'
import { getFirestore as getClientFirestore,connectFirestoreEmulator,doc,getDoc,setDoc } from 'firebase/firestore'
import { auditedCreate,auditedUpdate,auditedDelete,AUDIT_COLLECTION } from '../lib/server/audit-log.mjs'
import { decryptJson } from '../lib/server/field-encryption.mjs'
const host=process.env.FIRESTORE_EMULATOR_HOST,projectId=process.env.GCLOUD_PROJECT
if(!['127.0.0.1:8080','localhost:8080'].includes(host)||!/^demo-[a-z0-9-]+$/.test(projectId||''))throw new Error('Requires local Firebase Emulator demo project')
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({auditTest:randomBytes(32).toString('base64')})
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='auditTest'
const salt=randomBytes(8).toString('hex'),app=initializeApp({projectId},'ftb-audit-admin-'+salt),db=getFirestore(app)
const client=initializeClient({projectId,appId:'1:123456789:web:audit',apiKey:'fake-audit-key'},'ftb-audit-browser-'+salt)
const browserDb=getClientFirestore(client)
connectFirestoreEmulator(browserDb,'127.0.0.1',8080)
test('create, update and delete emit 3 atomic events with protected before/after',async()=>{
 const ref=db.collection('area_audit_fixtures').doc('test_'+salt)
 await auditedCreate(ref,{name:'Pessoa Original',estado:'ativo'},{module:'test-audit',actorUid:'fixture-admin'})
 assert.equal((await ref.get()).get('name'),'Pessoa Original')
 assert.equal(await auditedUpdate(ref,{name:'Pessoa Alterada'},{module:'test-audit',actorUid:'fixture-admin'}),true)
 assert.equal(await auditedDelete(ref,{module:'test-audit',actorUid:'fixture-admin'}),true)
 assert.equal((await ref.get()).exists,false)
 const rows=await db.collection(AUDIT_COLLECTION).where('recordPath','==',ref.path).get()
 assert.equal(rows.size,3)
 const byAction=Object.fromEntries(rows.docs.map(d=>[d.get('action'),{ref:d.ref,data:d.data()}]))
 assert.deepEqual(Object.keys(byAction).sort(),['create','delete','update'])
 for(const v of Object.values(byAction)){
  assert.equal(v.data.actorUid,'fixture-admin')
  assert.equal(v.data.snapshotProtected,true)
  assert.equal(JSON.stringify(v.data).includes('Pessoa Original'),false)
 }
 assert.equal(decryptJson(byAction.create.data.afterEncrypted,byAction.create.ref.path+'#after').name,'Pessoa Original')
 assert.equal(decryptJson(byAction.update.data.beforeEncrypted,byAction.update.ref.path+'#before').name,'Pessoa Original')
 assert.equal(decryptJson(byAction.update.data.afterEncrypted,byAction.update.ref.path+'#after').name,'Pessoa Alterada')
 assert.equal(decryptJson(byAction.delete.data.beforeEncrypted,byAction.delete.ref.path+'#before').name,'Pessoa Alterada')
})
test('untrusted Firestore clients cannot read, overwrite or delete audit events',async()=>{
 const target=doc(browserDb,AUDIT_COLLECTION,'probe_'+salt)
 await assert.rejects(getDoc(target),e=>e?.code==='permission-denied')
 await assert.rejects(setDoc(target,{actorUid:'forged'}),e=>e?.code==='permission-denied')
})
test.after(async()=>{await deleteClient(client);await deleteApp(app)})
