import test from 'node:test'
import assert from 'node:assert/strict'
import { MODULES, parseModuleChange, evaluateModuleStates, isKnownModule } from '../lib/server/module-registry.mjs'

test('all operational modules have unique identifiers and fixed definitions', () => {
  assert.deepEqual(MODULES.map(m=>m.id), ['schools','students','material','deliveries','documents'])
  assert.equal(new Set(MODULES.map(m=>m.id)).size, MODULES.length)
  assert.equal(isKnownModule('finance'), false)
})

test('strict, optimistic settings mutation rejects forgery and invalid revisions', () => {
  assert.deepEqual(parseModuleChange({moduleId:'schools',enabled:false,expectedRevision:0}),{moduleId:'schools',enabled:false,expectedRevision:0})
  for(const input of [
    {moduleId:'finance',enabled:false,expectedRevision:0},
    {moduleId:'schools',enabled:'true',expectedRevision:0},
    {moduleId:'schools',enabled:true,expectedRevision:-1},
    {moduleId:'schools',enabled:true,expectedRevision:0,admin:true},
    {moduleId:'schools',enabled:true},
    null,
  ]) assert.throws(()=>parseModuleChange(input))
})

test('fresh installs are disabled even when technical prerequisites are satisfied', () => {
  const s=evaluateModuleStates({}, {})
  assert.ok(s.every(x=>!x.enabled && !x.desiredEnabled && x.revision===0))
})

test('server safety cap blocks an administrator toggle if environment is not ready', () => {
  const records={schools:{enabled:true,revision:2,updatedBy:'admin'}}
  const s=evaluateModuleStates(records,{schools:['Chave indisponível']})
  assert.equal(s.find(x=>x.id==='schools').enabled,false)
  assert.equal(s.find(x=>x.id==='schools').desiredEnabled,true)
  assert.equal(s.find(x=>x.id==='schools').blockers.length,1)
})

test('dependant modules fail closed if parents are disabled or blocked', () => {
  const records={students:{enabled:true},deliveries:{enabled:true},material:{enabled:true},schools:{enabled:true}}
  const blocked=evaluateModuleStates(records,{schools:['Bloqueio técnico']})
  assert.equal(blocked.find(x=>x.id==='students').enabled,false)
  assert.equal(blocked.find(x=>x.id==='students').ready,false)
  assert.equal(blocked.find(x=>x.id==='deliveries').enabled,true)
  const parentOff=evaluateModuleStates({...records,material:{enabled:false}}, {})
  assert.equal(parentOff.find(x=>x.id==='deliveries').enabled,false)
})

test('only explicit true enables a module, and disabled state never becomes active', () => {
  const records={schools:{enabled:'true'},documents:{enabled:1},material:{enabled:true,revision:3}}
  const status=evaluateModuleStates(records,{})
  assert.equal(status.find(x=>x.id==='schools').enabled,false)
  assert.equal(status.find(x=>x.id==='documents').enabled,false)
  assert.equal(status.find(x=>x.id==='material').enabled,true)
})
