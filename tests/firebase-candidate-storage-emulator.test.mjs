import test from 'node:test'
import assert from 'node:assert/strict'
import {randomBytes} from 'node:crypto'
import {initializeApp,deleteApp} from 'firebase/app'
import {getStorage,connectStorageEmulator,ref,getMetadata,listAll,uploadString,deleteObject} from 'firebase/storage'

if(!['127.0.0.1:9199','localhost:9199'].includes(process.env.FIREBASE_STORAGE_EMULATOR_HOST || process.env.STORAGE_EMULATOR_HOST) ||
 !/^demo-[a-z0-9-]+$/.test(process.env.GCLOUD_PROJECT||'')){
 throw Error('Storage Rules tests must use local emulator and demo project')
}
const project=process.env.GCLOUD_PROJECT, nonce=randomBytes(6).toString('hex')
const app=initializeApp({apiKey:'demo-key',appId:'1:123:web:demo',projectId:project,storageBucket:project+'.firebasestorage.app'},'storage-rules-'+nonce)
const store=getStorage(app)
connectStorageEmulator(store,'127.0.0.1',9199)
const denied=async p=>assert.rejects(p,e=>e?.code==='storage/unauthorized')
test('anonymous public get can find only approved public-image folders',async()=>{
 for(const folder of ['membros','noticias','parceiros','carrossel']){
  const obj=ref(store,folder+'/does-not-exist-'+nonce+'.jpg')
  // A missing public object returns 404; a rule denial would return 403.
  await assert.rejects(getMetadata(obj),e=>e?.code==='storage/object-not-found')
  await denied(uploadString(obj,'attempted public modification'))
  await denied(listAll(ref(store,folder)))
 }
})
test('private documents deny all browser actions, even when signed in elsewhere',async()=>{
 const p=ref(store,'private/documents/pupil-'+nonce+'/v1')
 await denied(getMetadata(p))
 await denied(uploadString(p,'secret'))
 await denied(deleteObject(p))
 await denied(listAll(ref(store,'private/documents')))
})
test('unknown folders deny reads, writes and enumeration',async()=>{
 const p=ref(store,'internal/secret-'+nonce+'.txt')
 await denied(getMetadata(p))
 await denied(uploadString(p,'secret'))
 await denied(deleteObject(p))
 await denied(listAll(ref(store,'internal')))
})
test.after(async()=>{await deleteApp(app)})
