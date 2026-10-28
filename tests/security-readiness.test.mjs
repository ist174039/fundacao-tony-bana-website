import test from 'node:test'
import assert from 'node:assert/strict'
import {isDistinctPrivateBucket,documentBucketIsAcceptable,reviewBlockers,environmentReviewBlockers} from '../lib/server/security-readiness.mjs'
test('All operational modules fail closed without Firebase Rules review',()=>{
 for(const id of ['schools','students','material','deliveries','documents']){
  assert.match(reviewBlockers(id).join(' '),/Firestore/)
  assert.equal(reviewBlockers(id,{firestoreRulesReviewed:true}).length,id==='documents'?2:0)
 }
})
test('Private documents reject shared or absent buckets',()=>{
 const publicBucket='fundacao-public.firebasestorage.app', privateBucket='fundacao-private-docs.storage.googleapis.com'
 assert.equal(isDistinctPrivateBucket(publicBucket,publicBucket),false)
 assert.equal(isDistinctPrivateBucket('',publicBucket),false)
 assert.equal(isDistinctPrivateBucket('INVALID_BUCKET',publicBucket),false)
 assert.equal(isDistinctPrivateBucket(privateBucket,publicBucket),true)
 assert.equal(reviewBlockers('documents',{firestoreRulesReviewed:true,storageRulesReviewed:true,privateBucket,publicBucket}).length,0)
})
test('Missing review attestations cannot be bypassed by installing encryption keys',()=>{
 const env={FTB_DATA_ENCRYPTION_KEYS_JSON:'present',FTB_DOCUMENTS_BUCKET:'fundacao-private-docs.storage.googleapis.com',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'fundacao-public.firebasestorage.app'}
 assert.equal(environmentReviewBlockers('documents',env).length,2)
 assert.equal(environmentReviewBlockers('documents',{...env,FTB_FIRESTORE_RULES_VERIFIED:'true'}).length,1)
 assert.equal(environmentReviewBlockers('documents',{...env,FTB_FIRESTORE_RULES_VERIFIED:'true',FTB_STORAGE_RULES_VERIFIED:'true'}).length,0)
})

test('Existing Firebase Storage is reusable only after explicit private-prefix review',()=>{
 const existing='fundacao-public.firebasestorage.app'
 const base={firestoreRulesReviewed:true,storageRulesReviewed:true,privateBucket:existing,publicBucket:existing}
 assert.equal(documentBucketIsAcceptable(base),false)
 assert.match(reviewBlockers('documents',base).join(' '),/private\/documents/)
 assert.equal(documentBucketIsAcceptable({...base,sharedBucketReviewed:true}),true)
 assert.equal(reviewBlockers('documents',{...base,sharedBucketReviewed:true}).length,0)
})
