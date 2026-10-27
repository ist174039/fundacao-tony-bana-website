import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {parseMaterialDelivery,parseDeliveryConfirmation,sealDelivery,openDelivery,MaterialDeliveryError} from '../lib/server/material-delivery.mjs';
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({test:randomBytes(32).toString('base64')});
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='test';
const sample={tipoDestino:'escola',escolaCodigo:'ESC001',destinoNome:'Escola A',localEntrega:'Secretaria da escola',entreguePorNome:'Voluntário Um',itens:[{loteId:'lot_example_001',quantidade:3}]};
test('delivery captures destination, deliverer and stock lots; rejects server metadata injection',()=>{
 const input=parseMaterialDelivery({...sample,estado:'entregue',confirmadoPor:'attacker',entregueEm:'1900-01-01'});
 assert.equal(input.estado,undefined);assert.equal(input.confirmadoPor,undefined);assert.equal(input.itens[0].quantidade,3);
});
test('rejects invalid quantity, duplicate lots and missing location',()=>{
 for(const changes of [{itens:[{loteId:'lot_example_001',quantidade:0}]},{itens:[{loteId:'lot_example_001',quantidade:2},{loteId:'lot_example_001',quantidade:1}]},{localEntrega:''},{tipoDestino:'outro'}])
  assert.throws(()=>parseMaterialDelivery({...sample,...changes}),MaterialDeliveryError);
});
test('delivery PII and descriptions stay encrypted at rest and path authenticated',()=>{
 const record={...parseMaterialDelivery(sample),estado:'pendente'};
 const doc=sealDelivery(record,'area_material_deliveries/abc123abc123');
 for(const term of ['Escola A','Secretaria da escola','Voluntário Um','lot_example_001'])assert.equal(JSON.stringify(doc).includes(term),false);
 assert.equal(openDelivery(doc,'area_material_deliveries/abc123abc123').entreguePorNome,'Voluntário Um');
 assert.throws(()=>openDelivery(doc,'area_material_deliveries/different12345'));
});
test('confirmation requires receiver, real date and rejects future dates',()=>{
 assert.equal(parseDeliveryConfirmation({recebidoPorNome:'Diretor',dataEntrega:'2026-10-26'},new Date('2026-10-27T12:00Z')).dataEntrega,'2026-10-26');
 assert.throws(()=>parseDeliveryConfirmation({recebidoPorNome:'A',dataEntrega:'2026-10-26'},new Date('2026-10-27T12:00Z')));
 assert.throws(()=>parseDeliveryConfirmation({recebidoPorNome:'Diretor',dataEntrega:'2026-11-26'},new Date('2026-10-27T12:00Z')));
});
