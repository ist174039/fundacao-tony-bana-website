import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { MaterialDeliveryError, parseMaterialDelivery, sealDelivery, openDelivery } from '@/lib/server/material-delivery.mjs'

export const runtime = 'nodejs'
const enabled = () => process.env.FTB_MATERIAL_DELIVERIES_ENABLED === 'true'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
async function authorize(request: Request) {
  if (!enabled() || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return null
  return requireAreaAdmin(request)
}
export async function GET(request: Request) {
  if (!(await isOperationalModuleEnabled('deliveries'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (!enabled() || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return fail('Entregas de doações indisponíveis.',503)
  if (!(await authorize(request))) return fail('Sem permissão.',403)
  try {
    const snapshot = await getFirebaseAdminFirestore().collection('area_material_deliveries').orderBy('criadoEm','desc').limit(200).get()
    return NextResponse.json({entregas:snapshot.docs.map(doc=>({id:doc.id,...openDelivery(doc.data(),doc.ref.path)}))})
  } catch { return fail('Não foi possível consultar entregas.',500) }
}
export async function POST(request: Request) {
  if (!(await isOperationalModuleEnabled('deliveries'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (!enabled() || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return fail('Entregas de doações indisponíveis.',503)
  const actor = await authorize(request)
  if (!actor) return fail('Sem permissão.',403)
  try {
    const input = parseMaterialDelivery(await request.json())
    const db = getFirebaseAdminFirestore()
    if (input.escolaCodigo) {
      const school = await db.collection('area_schools').doc(input.escolaCodigo).get()
      if (!school.exists || school.get('estado')!=='ativa') return fail('Escola de destino inexistente ou inativa.',422)
    }
    // Reserve inside a Firestore transaction to prevent competing pending deliveries.
    const ref=db.collection('area_material_deliveries').doc(),stamp=new Date().toISOString()
    const numero=`ENT-${stamp.slice(0,10).replace(/-/g,'')}-${ref.id.slice(0,8).toUpperCase()}`
    const reserved=await db.runTransaction(async tx=>{
      const lotRefs=input.itens.map(line=>db.collection('area_material_stock_lots').doc(line.loteId))
      const lots=await Promise.all(lotRefs.map(x=>tx.get(x)))
      for(let i=0;i<lots.length;i++){
        const physical=Number(lots[i].get('quantidadeDisponivel'))
        const reserved=Number(lots[i].get('quantidadeReservada')||0)
        if(!lots[i].exists||!Number.isFinite(physical)||!Number.isFinite(reserved)||physical-reserved<input.itens[i].quantidade)return false
      }
      for(let i=0;i<lots.length;i++){
        const before=lots[i],newReserved=Math.round((Number(before.get('quantidadeReservada')||0)+input.itens[i].quantidade)*1000)/1000
        tx.update(before.ref,{quantidadeReservada:newReserved})
      }
      const doc={...sealDelivery(input,ref.path),numero,estado:'pendente',reservaAtiva:true,criadoEm:stamp,criadoPor:actor.uid,entregueEm:null,confirmadoPor:null}
      tx.create(ref,doc)
      appendAuditEvent(tx,db,{module:'material-deliveries',action:'create',recordPath:ref.path,actorUid:actor.uid,after:doc,at:stamp})
      return true
    })
    if(!reserved)return fail('Stock livre insuficiente para reservar esta entrega.',409)
    return NextResponse.json({entrega:{id:ref.id,numero,estado:'pendente'}},{status:201})
  } catch(error) {
    if(error instanceof MaterialDeliveryError || error instanceof SyntaxError) return fail(error.message,400)
    return fail('Não foi possível registar a entrega.',500)
  }
}
