import {NextResponse} from 'next/server'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {openDelivery} from '@/lib/server/material-delivery.mjs'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export async function POST(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('deliveries'))||process.env.FTB_MATERIAL_DELIVERIES_ENABLED!=='true'||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Entregas indisponíveis.'},{status:503})
 const admin=await requireAreaAdmin(request)
 if(!admin)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Identificador inválido.'},{status:400})
 try{
  const body=await request.json()
  if(typeof body?.reason!=='string'||body.reason.trim().length<5||body.reason.length>500)return NextResponse.json({error:'Indica o motivo do cancelamento.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_material_deliveries').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const snap=await tx.get(ref)
   if(!snap.exists)return 'missing'
   const delivery=openDelivery(snap.data(),ref.path)
   if(delivery.estado==='cancelada')return 'already'
   if(delivery.estado!=='pendente')return 'invalid'
   const lotRefs=delivery.reservaAtiva===true?delivery.itens.map((line:{loteId:string})=>db.collection('area_material_stock_lots').doc(line.loteId)):[]
   const lots=await Promise.all(lotRefs.map((lot:typeof ref)=>tx.get(lot)))
   if(lots.some(lot=>!lot.exists))return 'invalid'
   const now=new Date().toISOString()
   for(let i=0;i<lots.length;i++){
    const reserved=Number(lots[i].get('quantidadeReservada')||0),quantity=delivery.itens[i].quantidade
    if(reserved<quantity)return 'invalid'
    tx.update(lots[i].ref,{quantidadeReservada:Math.round((reserved-quantity)*1000)/1000})
   }
   const change={estado:'cancelada',reservaAtiva:false,canceladoPor:admin.uid,canceladoEm:now,motivoCancelamento:body.reason.trim()}
   tx.update(ref,change)
   appendAuditEvent(tx,db,{module:'material-deliveries',action:'update',recordPath:ref.path,actorUid:admin.uid,before:snap.data(),after:{...snap.data(),...change},at:now})
   return 'cancelled'
  })
  if(result==='missing')return NextResponse.json({error:'Entrega inexistente.'},{status:404})
  if(result==='invalid')return NextResponse.json({error:'Entrega não cancelável.'},{status:409})
  return NextResponse.json({estado:'cancelada',changed:result==='cancelled'})
 }catch{return NextResponse.json({error:'Falha ao cancelar entrega.'},{status:500})}
}
