import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { changedFields,buildAuditEvent,appendAuditEvent,AuditError } from '../lib/server/audit-log.mjs'
import { decryptJson } from '../lib/server/field-encryption.mjs'
test('changed fields detects additions, modifications and deletions without returning values',()=>{
 assert.deepEqual(changedFields({a:'old',b:1,c:'removed'},{a:'new',b:1,d:'added'}),['a','c','d'])
})
test('audit events are metadata-only without keys, never leaking personal data',()=>{
 const prior=process.env.FTB_DATA_ENCRYPTION_KEYS_JSON,kid=process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
 delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON;delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
 try {
  const row=buildAuditEvent({module:'schools',action:'delete',recordPath:'area_schools/ESC01',actorUid:'admin-A',before:{nome:'Person secret',email:'secret@example.invalid'}},'area_audit_events/audit_001')
  assert.equal(row.beforeEncrypted,null);assert.equal(row.snapshotProtected,false)
  assert.deepEqual(row.changedFields,['email','nome'])
  assert.equal(JSON.stringify(row).includes('Person secret'),false)
  assert.equal(JSON.stringify(row).includes('secret@example.invalid'),false)
 }finally{
  if(prior===undefined)delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON;else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=prior
  if(kid===undefined)delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID;else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID=kid
 }
})
test('secure audit snapshots are encrypted and bound to the event path',()=>{
 process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({test:randomBytes(32).toString('base64')})
 process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='test'
 const path='area_audit_events/audit_002'
 const event=buildAuditEvent({module:'students',action:'update',recordPath:'area_students/student_01',actorUid:'admin-A',before:{nome:'Alice'},after:{nome:'Berta'}},path)
 assert.equal(event.snapshotProtected,true)
 assert.equal(event.snapshotAvailable,true)
 assert.equal(JSON.stringify(event).includes('Alice'),false)
 assert.equal(JSON.stringify(event).includes('Berta'),false)
 assert.deepEqual(decryptJson(event.beforeEncrypted,path+'#before'),{nome:'Alice'})
 assert.deepEqual(decryptJson(event.afterEncrypted,path+'#after'),{nome:'Berta'})
 assert.throws(()=>decryptJson(event.beforeEncrypted,'area_audit_events/audit_003#before'))
})
test('transactional audit append uses the same writer as data mutations',()=>{
 const ops=[]
 const fakeDb={collection:(name)=>({doc:()=>({path:name+'/audit_001',id:'audit_001'})})}
 const id=appendAuditEvent({create:(ref,value)=>ops.push({ref,value})},fakeDb,{module:'documents',action:'create',recordPath:'area_doc_files/file_001',actorUid:'admin-A',after:{version:1}})
 assert.equal(id,'audit_001');assert.equal(ops.length,1);assert.equal(ops[0].value.action,'create')
 assert.throws(()=>buildAuditEvent({module:'a',action:'drop',recordPath:'r',actorUid:'u'},'area_audit_events/x'),AuditError)
})
