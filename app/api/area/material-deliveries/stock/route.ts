import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { openStockLot } from '@/lib/server/material-delivery.mjs'
export const runtime = 'nodejs'
export async function GET(request: Request) {
  if(process.env.FTB_MATERIAL_DELIVERIES_ENABLED!=='true' || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured())
    return NextResponse.json({error:'Stock indisponível.'},{status:503})
  if(!(await requireAreaAdmin(request))) return NextResponse.json({error:'Sem permissão.'},{status:403})
  try {
    const docs=await getFirebaseAdminFirestore().collection('area_material_stock_lots').limit(500).get()
    const lotes=docs.docs.filter(d=>Number(d.get('quantidadeDisponivel'))>0).map(d=>({id:d.id,...openStockLot(d.data(),d.ref.path)}))
    return NextResponse.json({lotes})
  } catch { return NextResponse.json({error:'Não foi possível consultar o stock.'},{status:500}) }
}
