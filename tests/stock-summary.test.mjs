import test from 'node:test'
import assert from 'node:assert/strict'
import {summarizeStock} from '../lib/server/stock-summary.mjs'
test('Counts only available lots, groups quantities by unit and tracks delivered totals',()=>{
 const summary=summarizeStock([{categoria:'Educação',unidade:'un',quantidadeRecebida:10,quantidadeDisponivel:4},{categoria:'Higiene',unidade:'kg',quantidadeRecebida:5,quantidadeDisponivel:5},{categoria:'Educação',unidade:'un',quantidadeRecebida:2,quantidadeDisponivel:0}])
 assert.equal(summary.lots,3)
 assert.equal(summary.availableLots,2)
 assert.equal(summary.exhaustedLots,1)
 assert.equal(summary.categories,2)
 assert.deepEqual(summary.units,[{unit:'kg',received:5,available:5,distributed:0},{unit:'un',received:12,available:4,distributed:8}])
})
test('Empty inventory returns no incorrect totals',()=>assert.deepEqual(summarizeStock([]),{lots:0,availableLots:0,exhaustedLots:0,categories:0,units:[]}))
