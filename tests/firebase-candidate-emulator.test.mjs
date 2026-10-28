import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {initializeApp as initAdmin,deleteApp as delAdmin} from 'firebase-admin/app'
import {getFirestore as getAdminDb} from 'firebase-admin/firestore'
import {initializeApp as initClient,deleteApp as delClient} from 'firebase/app'
import {getFirestore,connectFirestoreEmulator,doc,getDoc,setDoc,deleteDoc,getDocs,collection} from 'firebase/firestore'
if(!['127.0.0.1:8080','localhost:8080'].includes(process.env.FIRESTORE_EMULATOR_HOST)||
 !/^demo-[a-z0-9-]+$/.test(process.env.GCLOUD_PROJECT||''))throw Error('Requires isolated demo-* Firestore Emulator')
const projectId=process.env.GCLOUD_PROJECT,id=randomBytes(5).toString('hex')
const admin=initAdmin({projectId},'rules-admin-'+id),db=getAdminDb(admin)
const app=initClient({projectId,apiKey:'demo-key',appId:'1:123:web:demo'},'rules-client-'+id)
const browser=getFirestore(app)
connectFirestoreEmulator(browser,'127.0.0.1',8080)
test('Public website can read but never modify public content',async()=>{
 await db.collection('noticias').doc(id).create({titulo:'Notícia de TEST'})
 const ref=doc(browser,'noticias',id)
 assert.equal((await getDoc(ref)).get('titulo'),'Notícia de TEST')
 assert.equal((await getDocs(collection(browser,'noticias'))).docs.some(d=>d.id===id),true)
 await assert.rejects(setDoc(ref,{titulo:'Forjado'}),e=>e?.code==='permission-denied')
 await assert.rejects(deleteDoc(ref),e=>e?.code==='permission-denied')
})
test('Private records, audit events and module config are inaccessible to browser',async()=>{
 for(const col of ['area_socios','area_schools','area_students','area_financial_transactions','area_doc_files','area_audit_events','area_module_settings']){
  const ref=doc(browser,col,id)
  await db.collection(col).doc(id).create({privateMarker:'sensitive'})
  await assert.rejects(getDoc(ref),e=>e?.code==='permission-denied')
  await assert.rejects(setDoc(ref,{privateMarker:'forged'}),e=>e?.code==='permission-denied')
  await assert.rejects(deleteDoc(ref),e=>e?.code==='permission-denied')
 }
})
test.after(async()=>{await delClient(app);await delAdmin(admin)})
