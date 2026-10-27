import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { sealStockItem } from '../lib/server/private-records.mjs'
import { parseMaterialDelivery,sealDelivery,openDelivery,confirmMaterialDelivery } from '../lib/server/material-delivery.mjs'
const host=process.env.FIRESTORE_EMULATOR_HOST,projectId=process.env.GCLOUD_PROJECT
if(!['127.0.0.1:8080','localhost:8080'].includes(host)||!/^demo-[a-z0-9-]+$/.test(projectId||''))throw new Error('Firestore Emulator with demo-* project required')
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({test:randomBytes(32).toString('base64')})
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='test'
const seed=randomBytes(6).toString('hex'),app=initializeApp({projectId},'ftb-delivery-'+seed),db=getFirestore(app)
const schoolId='ESC'+seed.toUpperCase()
const baseInput={tipoDestino:'escola',escolaCodigo:schoolId,destinoNome:'Escola Sintética',localEntrega:'Secretaria',entreguePorNome:'Voluntário A'}
const confirmation={recebidoPorNome:'Direção',dataEntrega:'2026-10-26',referenciaComprovativo:'DOC-SYNTHETIC'}
test('confirmed delivery updates balances atomically, records actor/recipient and cannot double-spend',async()=>{
 await db.collection('area_schools').doc(schoolId).create({codigo:schoolId,estado:'ativa'})
 const lot=db.collection('area_material_stock_lots').doc('lot'+seed)
 await lot.create({...sealStockItem({categoria:'Educação',descricao:'Cadernos',quantidade:10,unidade:'un',estado:'novo'},lot.path),rececaoId:'synthetic'+seed})
 const add=async n=>{
  const ref=db.collection('area_material_deliveries').doc('delivery'+seed+n)
  const input=parseMaterialDelivery({...baseInput,itens:[{loteId:lot.id,quantidade:7}]})
  await ref.create({...sealDelivery(input,ref.path),estado:'pendente',criadoEm:'2026-10-27T09:00:00Z'})
  return ref
 }
 const a=await add('A'),b=await add('B')
 const stamp=()=> '2026-10-27T12:00:00Z'
 const outcomes=await Promise.all([confirmMaterialDelivery(db,a.id,'admin-fixture-A',confirmation,stamp),confirmMaterialDelivery(db,b.id,'admin-fixture-B',confirmation,stamp)])
 assert.deepEqual([...outcomes].sort(),['confirmed','insufficient-stock'])
 assert.equal((await lot.get()).get('quantidadeDisponivel'),3)
 const moves=await db.collection('area_material_stock_movements').where('tipo','==','saida').get()
 const mine=moves.docs.filter(d=>[a.id,b.id].includes(d.get('entregaId')))
 assert.equal(mine.length,1)
 const winner=outcomes[0]==='confirmed'?a:b
 assert.equal(await confirmMaterialDelivery(db,winner.id,'admin-fixture-C',confirmation,stamp),'already-confirmed')
 assert.equal((await lot.get()).get('quantidadeDisponivel'),3)
 const raw=(await winner.get()).data()
 for(const term of ['Voluntário A','Direção','Secretaria','Cadernos','DOC-SYNTHETIC'])assert.equal(JSON.stringify(raw).includes(term),false)
 const opened=openDelivery(raw,winner.path)
 assert.equal(opened.recebidoPorNome,'Direção')
 assert.equal(opened.itensEntregues[0].descricao,'Cadernos')
 assert.equal(raw.confirmadoPor.startsWith('admin-fixture-'),true)
})
test('inactivated destination cannot ship stock',async()=>{
 const ref=db.collection('area_material_deliveries').doc('invalid'+seed)
 await ref.create({...sealDelivery({...baseInput,itens:[{loteId:'lot'+seed,quantidade:1}]},ref.path),estado:'pendente'})
 await db.collection('area_schools').doc(schoolId).update({estado:'inativa'})
 assert.equal(await confirmMaterialDelivery(db,ref.id,'admin-fixture',confirmation,()=> '2026-10-27T12:00:00Z'),'invalid-destination')
 assert.equal((await ref.get()).get('estado'),'pendente')
})
test.after(async()=>{await deleteApp(app)})
