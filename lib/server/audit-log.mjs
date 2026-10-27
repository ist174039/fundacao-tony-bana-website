/**
 * Append-only audit events for all server-managed mutations.
 * No plaintext personal data or secrets may be persisted in the audit collection.
 * Audit records must be protected from client writes/deletes by actual Firestore Rules.
 */
import { encryptJson, isFieldEncryptionConfigured } from './field-encryption.mjs'

export class AuditError extends Error { constructor(message) { super(message); this.name='AuditError' } }
export const AUDIT_COLLECTION='area_audit_events'
export const AUDIT_ACTIONS=Object.freeze(['create','update','delete','confirm','share','activate','deactivate','auth-create','auth-update','upload','download','review','link'])
const validAction=new Set(AUDIT_ACTIONS)
const safeName=(s)=>typeof s==='string'&&s.length>0&&s.length<=220&&!/[\u0000-\u001f]/.test(s)
function serializable(value) {
 if (value==null) return null
 try {
  const result=JSON.stringify(value,(_k,v)=>{
   if (v && typeof v==='object' && typeof v.toDate==='function') return v.toDate().toISOString()
   if (v && typeof v==='object' && (v._methodName||v._type)) return '[firestore-value]'
   return v
  })
  if(!result || result.length>110000) return null
  return JSON.parse(result)
 }catch{return null}
}
export function changedFields(before,after) {
 const previous=before && typeof before==='object'&&!Array.isArray(before)?before:{}
 const current=after && typeof after==='object'&&!Array.isArray(after)?after:{}
 return [...new Set([...Object.keys(previous),...Object.keys(current)])]
   .filter(k=>JSON.stringify(previous[k])!==JSON.stringify(current[k]))
   .sort().slice(0,150)
}
export function buildAuditEvent({module,action,recordPath,actorUid,before=null,after=null,at=new Date().toISOString(),source='server'},auditPath) {
 if(!safeName(module)||!validAction.has(action)||!safeName(recordPath)||!safeName(actorUid)||!safeName(auditPath))throw new AuditError('Metadados de auditoria inválidos.')
 const beforeData=serializable(before),afterData=serializable(after)
 const fields=changedFields(beforeData,afterData)
 const encrypted=isFieldEncryptionConfigured()
 const capture=(value,label)=>encrypted&&value!==null?encryptJson(value,auditPath+'#'+label):null
 return {
  version:1,module,action,recordPath,actorUid,at,source,
  changedFields:fields,beforePresent:before!==null,afterPresent:after!==null,
  beforeEncrypted:capture(beforeData,'before'),afterEncrypted:capture(afterData,'after'),
  snapshotProtected:encrypted,
  // Without an encryption key, only audit metadata is recorded. Never leak unencrypted values.
  snapshotAvailable:encrypted&&((before===null||beforeData!==null)&&(after===null||afterData!==null))
 }
}
export function appendAuditEvent(writer,db,options) {
 const ref=db.collection(AUDIT_COLLECTION).doc()
 const event=buildAuditEvent(options,ref.path)
 writer.create(ref,event)
 return ref.id
}
export async function auditedCreate(ref,data,{actorUid,module,action='create',source='server'}) {
 const db=ref.firestore,batch=db.batch()
 batch.create(ref,data)
 appendAuditEvent(batch,db,{actorUid,module,action,recordPath:ref.path,after:data,source})
 await batch.commit()
}
export async function auditedUpdate(ref,changes,{actorUid,module,action='update',source='server'}) {
 const db=ref.firestore
 return db.runTransaction(async tx=>{
  const current=await tx.get(ref)
  if(!current.exists)return false
  tx.update(ref,changes)
  appendAuditEvent(tx,db,{actorUid,module,action,recordPath:ref.path,before:current.data(),after:{...current.data(),...changes},source})
  return true
 })
}
export async function auditedDelete(ref,{actorUid,module,source='server'}) {
 const db=ref.firestore
 return db.runTransaction(async tx=>{
  const current=await tx.get(ref)
  if(!current.exists)return false
  tx.delete(ref)
  appendAuditEvent(tx,db,{actorUid,module,action:'delete',recordPath:ref.path,before:current.data(),source})
  return true
 })
}
