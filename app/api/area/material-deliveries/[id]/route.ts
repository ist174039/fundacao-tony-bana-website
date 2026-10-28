import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured} from '@/lib/server/firebase-admin'
import {operationalActor,permittedSchool} from '@/lib/server/operational-authorization'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {parseMaterialDelivery,MaterialDeliveryError,sealDelivery,openDelivery} from '@/lib/server/material-delivery.mjs'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('deliveries'))||process.env.FTB_MATERIAL_DELIVERIES_ENABLED!=='true'||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Entregas indisponíveis.'},{status:503})
 const actor=await operationalActor(request,'deliveries','update')
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Identificador inválido.'},{status:400})
 try{
 const input=parseMaterialDelivery(await request.json())
 if(!actor.admin&&(!input.escolaCodigo||!permittedSchool(actor,input.escolaCodigo)))return NextResponse.json({error:'Sem acesso ao destino.'},{status:403})
 const db=getFirebaseAdminFirestore(),ref=db.collection('area_material_deliveries').doc(params.id)
 if(input.escolaCodigo){const school=await db.collection('area_schools').doc(input.escolaCodigo).get();if(!school.exists||school.get('estado')!=='ativa'||school.get('archivedAt'))return NextResponse.json({error:'Escola de destino inativa.'},{status:422})}
 const result=await db.runTransaction(async tx=>{
  const previous=await tx.get(ref)
  if(!previous.exists)return 'missing'
  const old=openDelivery(previous.data(),ref.path)
  if(old.estado!=='pendente')return 'locked'
  if(!actor.admin&&(!old.escolaCodigo||!permittedSchool(actor,old.escolaCodigo)))return 'denied'
  if(old.reservaAtiva!==true)return 'legacy'
  const oldAmounts=new Map<string,number>((old.itens as Array<{loteId:string;quantidade:number}>).map(l=>[l.loteId,l.quantidade]))
  const nextAmounts=new Map(input.itens.map(l=>[l.loteId,l.quantidade]))
  const ids=[...new Set([...oldAmounts.keys(),...nextAmounts.keys()])].sort()
  const lots=await Promise.all(ids.map(id=>tx.get(db.collection('area_material_stock_lots').doc(id))))
  for(let i=0;i<ids.length;i++){
    const lot=lots[i],reserved=Number(lot.get('quantidadeReservada')||0),physical=Number(lot.get('quantidadeDisponivel')),oldQty=oldAmounts.get(ids[i])||0,newQty=nextAmounts.get(ids[i])||0
    if(!lot.exists||!Number.isFinite(physical)||!Number.isFinite(reserved)||reserved<oldQty||physical-reserved+oldQty<newQty)return 'stock'
  }
  const at=new Date().toISOString()
  for(let i=0;i<ids.length;i++){
   const lot=lots[i],reserved=Number(lot.get('quantidadeReservada')||0),amount=Math.round((reserved-(oldAmounts.get(ids[i])||0)+(nextAmounts.get(ids[i])||0))*1000)/1000
   tx.update(lot.ref,{quantidadeReservada:amount,atualizadoEm:at})
  }
  const updates={...sealDelivery(input,ref.path),atualizadoEm:at,atualizadoPor:actor.uid}
  tx.update(ref,updates)
  appendAuditEvent(tx,db,{module:'material-deliveries',action:'update',recordPath:ref.path,actorUid:actor.uid,before:previous.data(),after:{...previous.data(),...updates},at})
  return 'updated'
 })
 if(result==='missing')return NextResponse.json({error:'Entrega inexistente.'},{status:404})
 if(result==='denied')return NextResponse.json({error:'Sem acesso à entrega.'},{status:403})
 if(result==='locked'||result==='legacy')return NextResponse.json({error:'Esta entrega não pode ser editada. Cancela e cria uma nova entrega.'},{status:409})
 if(result==='stock')return NextResponse.json({error:'Stock disponível insuficiente para atualizar reserva.'},{status:409})
 return NextResponse.json({success:true})
 }catch(e){return e instanceof MaterialDeliveryError||e instanceof SyntaxError?NextResponse.json({error:e.message},{status:400}):NextResponse.json({error:'Não foi possível editar entrega.'},{status:500})}
}
