/**
 * Manual security attestations are additional fail-closed activation gates,
 * NOT proof that current Firebase rules have actually been reviewed.
 */
const BUCKET=/^[a-z0-9][a-z0-9.-]{5,200}$/
export function isDistinctPrivateBucket(privateBucket, publicBucket) {
  return typeof privateBucket==='string'&&BUCKET.test(privateBucket)&&
    typeof publicBucket==='string'&&BUCKET.test(publicBucket)&&
    privateBucket!==publicBucket
}
export function reviewBlockers(moduleId,config={}) {
 const errors=[]
 if(config.firestoreRulesReviewed!==true)errors.push('Regras reais de Firestore não foram revistas neste ambiente.')
 if(moduleId==='documents'){
   if(config.storageRulesReviewed!==true)errors.push('Regras do Storage privado não foram revistas neste ambiente.')
   if(!isDistinctPrivateBucket(config.privateBucket,config.publicBucket))errors.push('Documentos exigem bucket privado dedicado, diferente do bucket público.')
 }
 return errors
}
export function environmentReviewBlockers(moduleId,env=process.env){
 return reviewBlockers(moduleId,{
  firestoreRulesReviewed:env.FTB_FIRESTORE_RULES_VERIFIED==='true',
  storageRulesReviewed:env.FTB_STORAGE_RULES_VERIFIED==='true',
  privateBucket:env.FTB_DOCUMENTS_BUCKET,
  publicBucket:env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
 })
}
