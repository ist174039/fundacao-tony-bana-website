import { appendAuditEvent } from './audit-log.mjs'
/** Physical outgoing material deliveries; never trust client actor, status, stock or timestamps. */
import { encryptJson, decryptJson, EncryptedDataError } from './field-encryption.mjs';

export class MaterialDeliveryError extends Error { constructor(message) { super(message); this.name = 'MaterialDeliveryError'; } }
const LOT_ID = /^[A-Za-z0-9_-]{8,100}$/;
const SCHOOL_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const DAY = /^20\d{2}-\d{2}-\d{2}$/;
const count = (value) => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1_000_000 && Math.round(value * 1000) === value * 1000;
const txt = (value, label, max, required = false) => {
  if (value == null && !required) return '';
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f]/.test(value)) throw new MaterialDeliveryError(`${label} inválido.`);
  const v = value.trim();
  if (required && v.length < 2) throw new MaterialDeliveryError(`${label} obrigatório.`);
  return v;
};
function validDay(value) {
  if (!DAY.test(value) || Number.isNaN(Date.parse(value+'T12:00:00Z')) || new Date(value+'T12:00:00Z').toISOString().slice(0,10) !== value)
    throw new MaterialDeliveryError('Data de entrega inválida.');
  return value;
}
export function parseMaterialDelivery(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new MaterialDeliveryError('Entrega inválida.');
  const tipoDestino = raw.tipoDestino;
  if (!['escola','entidade'].includes(tipoDestino)) throw new MaterialDeliveryError('Tipo de destino inválido.');
  const escolaCodigo = tipoDestino === 'escola' ? txt(raw.escolaCodigo,'Código da escola',32,true).toUpperCase() : null;
  if (escolaCodigo && !SCHOOL_CODE.test(escolaCodigo)) throw new MaterialDeliveryError('Escola inválida.');
  const destinoNome = txt(raw.destinoNome,'Nome do destino',160,true);
  const localEntrega = txt(raw.localEntrega,'Local de entrega',220,true);
  const entreguePorNome = txt(raw.entreguePorNome,'Responsável pela entrega',140,true);
  const previstoPara = raw.previstoPara ? validDay(raw.previstoPara) : null;
  const referenciaComprovativo = txt(raw.referenciaComprovativo,'Comprovativo',100);
  const observacoes = txt(raw.observacoes,'Observações',1000);
  if (!Array.isArray(raw.itens) || raw.itens.length < 1 || raw.itens.length > 50) throw new MaterialDeliveryError('Seleciona entre 1 e 50 artigos.');
  const unique = new Set();
  const itens = raw.itens.map((line,i) => {
    if (!line || typeof line !== 'object' || Array.isArray(line) || !LOT_ID.test(line.loteId) || !count(line.quantidade))
      throw new MaterialDeliveryError(`Artigo ${i+1} inválido.`);
    if (unique.has(line.loteId)) throw new MaterialDeliveryError('O mesmo lote não pode aparecer duas vezes.');
    unique.add(line.loteId);
    return {loteId: line.loteId, quantidade: line.quantidade};
  });
  return {tipoDestino,escolaCodigo,destinoNome,localEntrega,entreguePorNome,previstoPara,referenciaComprovativo,observacoes,itens};
}
export function parseDeliveryConfirmation(raw, now = new Date()) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new MaterialDeliveryError('Confirmação inválida.');
  const recebidoPorNome = txt(raw.recebidoPorNome,'Pessoa que recebeu',140,true);
  const dataEntrega = validDay(txt(raw.dataEntrega,'Data de entrega',10,true));
  if (dataEntrega > now.toISOString().slice(0,10)) throw new MaterialDeliveryError('A data não pode ser futura.');
  const referenciaComprovativo = txt(raw.referenciaComprovativo,'Referência do comprovativo',100);
  return {recebidoPorNome,dataEntrega,referenciaComprovativo};
}
const PRIVATE_KEYS = ['destinoNome','localEntrega','entreguePorNome','recebidoPorNome','referenciaComprovativo','observacoes','itens','itensEntregues'];
export function sealDelivery(input,path) {
  const publicData = {...input}, sensitive = {};
  for (const key of PRIVATE_KEYS) if (Object.hasOwn(publicData,key)) { sensitive[key] = publicData[key]; delete publicData[key]; }
  return {...publicData,dadosPrivados:encryptJson(sensitive,path+'#delivery')};
}
export function openDelivery(input,path) {
  if (!input?.dadosPrivados) throw new EncryptedDataError();
  const {dadosPrivados,...publicData} = input;
  return {...publicData,...decryptJson(dadosPrivados,path+'#delivery')};
}
export function openStockLot(input,path) {
  if (!input?.dadosPrivados || !Number.isFinite(input.quantidadeDisponivel)) throw new EncryptedDataError();
  const privateData = decryptJson(input.dadosPrivados,path+'#stock');
  return { ...privateData,quantidadeDisponivel:input.quantidadeDisponivel,quantidadeRecebida:input.quantidadeRecebida,unidade:input.unidade,rececaoId:input.rececaoId };
}
/** Atomic, idempotent stock deduction. Reads all lots before any transaction writes. */
export async function confirmMaterialDelivery(db,id,actorUid,confirmation,now=()=>new Date().toISOString()) {
  if (typeof id !== 'string' || !/^[A-Za-z0-9]{12,40}$/.test(id) || !actorUid) throw new MaterialDeliveryError('Identificador inválido.');
  const stamp = now(), confirmed = parseDeliveryConfirmation(confirmation,new Date(stamp));
  const ref = db.collection('area_material_deliveries').doc(id);
  return db.runTransaction(async tx => {
    const doc = await tx.get(ref);
    if (!doc.exists) return 'not-found';
    const delivery = openDelivery(doc.data(),ref.path);
    if (delivery.estado === 'entregue') return 'already-confirmed';
    if (delivery.estado !== 'pendente' || !Array.isArray(delivery.itens) || !delivery.itens.length) return 'invalid-state';
    const lines = parseMaterialDelivery(delivery).itens;
    const refs = lines.map(line=>db.collection('area_material_stock_lots').doc(line.loteId));
    const snapshots = await Promise.all(refs.map(lot=>tx.get(lot)));
    let school;
    if (delivery.tipoDestino === 'escola') school = await tx.get(db.collection('area_schools').doc(delivery.escolaCodigo));
    if (school && (!school.exists || school.get('estado') !== 'ativa')) return 'invalid-destination';
    if (snapshots.some((lot,i)=>!lot.exists || !Number.isFinite(lot.get('quantidadeDisponivel')) || lot.get('quantidadeDisponivel') < lines[i].quantidade || (delivery.reservaAtiva===true && Number(lot.get('quantidadeReservada')||0)<lines[i].quantidade))) return 'insufficient-stock';
    const received = snapshots.map((lot,i)=>{
      const detail = openStockLot(lot.data(),lot.ref.path);
      return {loteId:lot.id,descricao:detail.descricao,categoria:detail.categoria,unidade:detail.unidade,quantidade:lines[i].quantidade};
    });
    for (let i=0;i<lines.length;i++) {
      const line=lines[i],lot=snapshots[i];
      const remaining = Math.round((lot.get('quantidadeDisponivel')-line.quantidade)*1000)/1000;
      const remainingReserved=delivery.reservaAtiva===true?Math.round((Number(lot.get('quantidadeReservada')||0)-line.quantidade)*1000)/1000:Number(lot.get('quantidadeReservada')||0);
      tx.update(lot.ref,{quantidadeDisponivel:remaining,quantidadeReservada:remainingReserved,atualizadoEm:stamp});
      appendAuditEvent(tx,db,{module:'stock',action:'update',recordPath:lot.ref.path,actorUid,before:lot.data(),after:{...lot.data(),quantidadeDisponivel:remaining,atualizadoEm:stamp},at:stamp});
      const movement=db.collection('area_material_stock_movements').doc(id+'-saida-'+i);
      const movementData={tipo:'saida',entregaId:id,loteId:lot.id,quantidade:line.quantidade,unidade:lot.get('unidade'),escolaCodigo:delivery.escolaCodigo||null,criadoEm:stamp,criadoPor:actorUid};
      tx.create(movement,movementData);
      appendAuditEvent(tx,db,{module:'stock-movements',action:'create',recordPath:movement.path,actorUid,after:movementData,at:stamp});
    }
    const deliveryUpdated={...sealDelivery({...delivery,...confirmed,itensEntregues:received,estado:'entregue'},ref.path),reservaAtiva:false,entregueEm:stamp,confirmadoPor:actorUid};
    tx.update(ref,deliveryUpdated);
    appendAuditEvent(tx,db,{module:'material-deliveries',action:'confirm',recordPath:ref.path,actorUid,before:doc.data(),after:deliveryUpdated,at:stamp});
    return 'confirmed';
  });
}
