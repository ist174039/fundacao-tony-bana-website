import test from 'node:test'
import assert from 'node:assert/strict'
import {resolveAuditActor} from '../lib/server/audit-actor.mjs'
test('Audit actor displays profile name and preserves UID separately',()=>{
 const info=resolveAuditActor('uid-fixture',{displayName:'Maria da Silva',email:'MARIA@EXAMPLE.INVALID'})
 assert.deepEqual(info,{actorName:'Maria da Silva',actorEmail:'maria@example.invalid'})
 assert.equal('actorUid' in info,false)
})
test('Fallbacks handle anonymous, deleted and unnamed users',()=>{
 assert.equal(resolveAuditActor('anonymous').actorName,'Anónimo')
 assert.equal(resolveAuditActor('deleted').actorName,'Utilizador não identificado')
 assert.equal(resolveAuditActor('uid',{email:'person@example.invalid'}).actorName,'person@example.invalid')
})
