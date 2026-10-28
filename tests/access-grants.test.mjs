import test from 'node:test';
import assert from 'node:assert/strict';
import { AccessGrantError, canAccess, validateAccessGrant } from '../lib/server/access-grants.mjs';
const logistics = { profiles: ['logistics'], schoolCodes: ['ESC-001'], overrides: [] };

test('deny by default, including unknown modules and administration', () => {
  for (const mod of ['users', 'students', 'unknown', '__proto__']) assert.equal(canAccess(logistics, mod, 'approve'), false);
  assert.equal(canAccess(null, 'schools', 'read'), false);
  assert.equal(canAccess({ profiles: [], schoolCodes: [], overrides: [] }, 'documents', 'read'), false);
});
test('profiles grant only listed actions; school-bound access is always scoped', () => {
  assert.equal(canAccess(logistics, 'stock', 'create', { schoolCode: 'ESC-001', schoolBound: true }), true);
  assert.equal(canAccess(logistics, 'stock', 'create', { schoolCode: 'ESC-002', schoolBound: true }), false);
  assert.equal(canAccess(logistics, 'stock', 'create', { schoolBound: true }), false);
  assert.equal(canAccess(logistics, 'stock', 'approve'), false);
  assert.equal(canAccess(logistics, 'finance', 'read'), false);
});
test('explicit deny overrides a profile; scoped extra permission cannot grant user management', () => {
  const v = { ...logistics, overrides: [{ module: 'stock', action: 'create', allow: false }, { module: 'documents', action: 'share', allow: true }] };
  assert.equal(canAccess(v, 'stock', 'create'), false);
  assert.equal(canAccess(v, 'documents', 'share', { schoolCode: 'ESC-001', schoolBound: true }), true);
  assert.equal(canAccess(v, 'documents', 'share', { schoolCode: 'ESC-002', schoolBound: true }), false);
  assert.throws(() => validateAccessGrant({ ...logistics, overrides: [{ module: 'users', action: 'update', allow: true }] }), AccessGrantError);
});
test('rejects privilege injection, unknown profiles, invalid scopes, duplicates and malformed overrides', () => {
  for (const grant of [
    { ...logistics, admin: true },
    { ...logistics, profiles: ['admin'] },
    { ...logistics, schoolCodes: ['ESC-001', 'ESC-001'] },
    { ...logistics, profiles: ['logistics', 'logistics'] },
    { ...logistics, schoolCodes: ['../other'] },
    { ...logistics, overrides: [{ module: 'stock', action: 'read', allow: 'true' }] },
    { ...logistics, overrides: [{ module: 'stock', action: 'read', allow: true }, { module: 'stock', action: 'read', allow: false }] },
  ]) assert.throws(() => validateAccessGrant(grant), AccessGrantError);
});
test('normalized policy only contains explicit allowlisted fields', () => {
  const grant = validateAccessGrant({ profiles: ['logistics'], schoolCodes: ['ESC-001'], overrides: [] });
  assert.deepEqual(Object.keys(grant).sort(), ['overrides', 'profiles', 'schoolCodes']);
  assert.equal(canAccess(grant, 'donations', 'create'), true);
});

test('independent status, edit and delete permissions across modules',()=>{
 const grant={profiles:[],schoolCodes:['ESC-001'],overrides:[{module:'deliveries',action:'change_status',allow:true},{module:'deliveries',action:'update',allow:false},{module:'deliveries',action:'delete',allow:false},{module:'families',action:'read',allow:true}]}
 assert.equal(canAccess(grant,'deliveries','change_status'),true)
 assert.equal(canAccess(grant,'deliveries','update'),false)
 assert.equal(canAccess(grant,'deliveries','delete'),false)
 assert.equal(canAccess(grant,'families','read'),true)
 assert.equal(canAccess(grant,'families','read',{schoolBound:true,schoolCode:'ESC-002'}),false)
 assert.equal(canAccess(grant,'assessments','change_status'),false)
})
