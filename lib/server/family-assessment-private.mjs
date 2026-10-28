import {encryptJson,decryptJson,EncryptedDataError} from './field-encryption.mjs'
export const STUDENT_ID=/^[a-f0-9]{64}$/
export function sealFamilyAssessment(value,path) {
 return {studentId:value.studentId,revision:value.revision,status:value.status,updatedAt:value.updatedAt,updatedBy:value.updatedBy,
  createdAt:value.createdAt,createdBy:value.createdBy,
  dadosPrivados:encryptJson(value.answers,path+'#family-assessment-v1')}
}
export function openFamilyAssessment(value,path){
 if(!value?.dadosPrivados||!STUDENT_ID.test(value.studentId)||!Number.isSafeInteger(value.revision))throw new EncryptedDataError()
 const answers=decryptJson(value.dadosPrivados,path+'#family-assessment-v1')
 if(!answers||typeof answers!=='object'||Array.isArray(answers))throw new EncryptedDataError()
 return {studentId:value.studentId,revision:value.revision,status:value.status,updatedAt:value.updatedAt,updatedBy:value.updatedBy,createdAt:value.createdAt,createdBy:value.createdBy,answers}
}
export const familyRevisionId=(revision)=>String(revision).padStart(6,'0')
/** Firestore transaction, immutable versioning and one atomic audit event. */
export async function saveFamilyAssessment(db,studentId,actorUid,raw,now=new Date().toISOString()){
 const {parseFamilyAssessmentSubmission}=await import('./family-assessment.mjs')
 const {appendAuditEvent}=await import('./audit-log.mjs')
 if(!STUDENT_ID.test(studentId)||!actorUid)throw new Error('Identificador de aluno ou autor inválido.')
 const input=parseFamilyAssessmentSubmission(raw)
 const studentRef=db.collection('area_students').doc(studentId)
 const ref=db.collection('area_student_family_assessments').doc(studentId)
 return db.runTransaction(async tx=>{
  const student=await tx.get(studentRef)
  const previous=await tx.get(ref)
  if(!student.exists)return {status:'not-found'}
  const currentRevision=previous.exists?previous.get('revision'):0
  if(!Number.isSafeInteger(currentRevision))throw new Error('Revisão corrompida.')
  if(input.expectedRevision!==currentRevision)return {status:'conflict',revision:currentRevision}
  const revision=currentRevision+1
  const record={studentId,revision,status:input.status,answers:input.answers,updatedAt:now,updatedBy:actorUid,
   createdAt:previous.exists?previous.get('createdAt'):now,createdBy:previous.exists?previous.get('createdBy'):actorUid}
  const sealed=sealFamilyAssessment(record,ref.path)
  const version=ref.collection('revisions').doc(familyRevisionId(revision))
  const immutable=sealFamilyAssessment(record,version.path)
  tx.set(ref,sealed)
  tx.create(version,immutable)
  appendAuditEvent(tx,db,{module:'student-family-assessment',action:previous.exists?'update':'create',recordPath:ref.path,actorUid,before:previous.exists?previous.data():null,after:sealed,at:now})
  return {status:'saved',revision}
 })
}
