import test from 'node:test'
import assert from 'node:assert/strict'
import {canonicalDeliveryDestination,parseMaterialDelivery,MaterialDeliveryError} from '../lib/server/material-delivery.mjs'
const base={tipoDestino:'escola',escolaCodigo:'ESC-001',destinoNome:'Nome forjado',localEntrega:'Entrada',entreguePorNome:'Voluntário',itens:[{loteId:'lot_example_001',quantidade:1}]}
test('School selection binds official database name rather than client supplied name',()=>{
 const parsed=parseMaterialDelivery(base)
 const result=canonicalDeliveryDestination(parsed,{codigo:'ESC-001',nome:'Escola Comunitária',estado:'ativa'})
 assert.equal(result.destinoNome,'Escola Comunitária')
 assert.equal(result.escolaCodigo,'ESC-001')
})
test('Inactive or nonexistent school cannot be used as delivery destination',()=>{
 for(const school of [null,{nome:'Escola',estado:'inativa'},{nome:'',estado:'ativa'}])
  assert.throws(()=>canonicalDeliveryDestination(parseMaterialDelivery(base),school),MaterialDeliveryError)
})
test('Other entities continue to use provided destination name',()=>{
 const input=parseMaterialDelivery({...base,tipoDestino:'entidade',escolaCodigo:'',destinoNome:'Associação Comunitária'})
 assert.equal(canonicalDeliveryDestination(input,null).destinoNome,'Associação Comunitária')
})
