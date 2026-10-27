import { NextResponse } from 'next/server'
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
  if (!enabled() || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return fail('Entregas de doações indisponíveis.',503)
  if (!(await authorize(request))) return fail('Sem permissão.',403)
  try {
    const snapshot = await getFirebaseAdminFirestore().collection('area_material_deliveries').orderBy('criadoEm','desc').limit(200).get()
    return NextResponse.json({entregas:snapshot.docs.map(doc=>({id:doc.id,...openDelivery(doc.data(),doc.ref.path)}))})
  } catch { return fail('Não foi possível consultar entregas.',500) }
}
export async function POST(request: Request) {
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
    // A pending delivery does not reserve or subtract stock. Confirmation is transactional.
    const lots = await Promise.all(input.itens.map(line=>db.collection('area_material_stock_lots').doc(line.loteId).get()))
    if (lots.some((lot,i)=>!lot.exists || Number(lot.get('quantidadeDisponivel'))<input.itens[i].quantidade))
      return fail('Stock disponível insuficiente para preparar a entrega.',409)
    const ref=db.collection('area_material_deliveries').doc(), stamp=new Date().toISOString()
    const numero=`ENT-${stamp.slice(0,10).replace(/-/g,'')}-${ref.id.slice(0,8).toUpperCase()}`
    await ref.create({...sealDelivery(input,ref.path),numero,estado:'pendente',criadoEm:stamp,criadoPor:actor.uid,entregueEm:null,confirmadoPor:null})
    return NextResponse.json({entrega:{id:ref.id,numero,estado:'pendente'}},{status:201})
  } catch(error) {
    if(error instanceof MaterialDeliveryError || error instanceof SyntaxError) return fail(error.message,400)
    return fail('Não foi possível registar a entrega.',500)
  }
}
