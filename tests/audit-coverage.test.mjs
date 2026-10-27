import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('private server mutations include atomic audit helpers',()=>{
 const paths=[
 'app/api/area/schools/route.ts','app/api/area/schools/[code]/route.ts','app/api/area/schools/[code]/contacts/route.ts',
 'app/api/area/students/route.ts','app/api/area/students/[id]/route.ts',
 'app/api/area/material-receptions/route.ts','lib/server/material-stock.mjs',
 'app/api/area/material-deliveries/route.ts','lib/server/material-delivery.mjs',
 'app/api/area/quotas/route.ts','app/api/area/transactions/route.ts',
 'app/api/area/socios/route.ts','lib/server/member-registry.mjs','lib/server/member-operations.mjs',
 'app/api/area/intentions/[id]/route.ts','lib/server/intention-review.mjs',
 'app/api/area/document-teams/route.ts','app/api/area/document-teams/[id]/route.ts',
 'app/api/area/document-folders/route.ts','app/api/area/documents/route.ts',
 'app/api/area/documents/[id]/versions/route.ts','app/api/area/documents/[id]/share/route.ts',
 'app/api/area/users/[uid]/access/route.ts','app/api/area/users/route.ts',
 'app/api/area/membership-link/route.ts','app/api/area/profile/route.ts',
 'app/api/membership-intentions/route.ts','app/api/area/site-content/route.ts',
 'app/api/area/site-content/media/route.ts','lib/server/module-settings.ts',
 ]
 for(const p of paths){
  const c=read(p)
  const hasAudit=/auditedCreate|auditedUpdate|auditedDelete|appendAuditEvent|writeExternalAudit|reviewMembershipIntention|updateMemberProfile|createSecureMember|confirmMaterialReceipt|confirmMaterialDelivery/.test(c)
  assert.ok(hasAudit,'Missing audit integration in '+p)
 }
})
test('public CMS writes no longer call Firebase directly',()=>{
 const source=read('lib/firebase-firestore.ts')
 assert.doesNotMatch(source,/await\s+(?:addDoc|updateDoc|deleteDoc|uploadBytes|deleteObject)\s*\(/)
 assert.match(source,/areaFetch.*\/api\/area\/site-content/)
 assert.match(source,/areaFetch.*\/api\/area\/site-content\/media/)
})
