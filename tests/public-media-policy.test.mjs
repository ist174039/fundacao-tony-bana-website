import test from 'node:test'
import assert from 'node:assert/strict'
import { validatePublicImage,MediaPolicyError } from '../lib/server/public-media-policy.mjs'
test('public media requires permitted folder, byte size, MIME and magic bytes',()=>{
 const png=Buffer.from([137,80,78,71,13,10,26,10,1])
 assert.equal(validatePublicImage(png,'image/png','membros'),true)
 assert.throws(()=>validatePublicImage(png,'image/jpeg','membros'),MediaPolicyError)
 assert.throws(()=>validatePublicImage(png,'image/png','documentos'),MediaPolicyError)
 assert.throws(()=>validatePublicImage(Buffer.alloc(0),'image/png','membros'),MediaPolicyError)
 assert.throws(()=>validatePublicImage(Buffer.alloc(5*1024*1024+1),'image/png','membros'),MediaPolicyError)
})
