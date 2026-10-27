import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { confirmMaterialDelivery, MaterialDeliveryError } from '@/lib/server/material-delivery.mjs'
export const runtime = 'nodejs'
export async function POST(request: Request,{params}:{params:{id:string}}) {
  if (!(await isOperationalModuleEnabled('deliveries'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if(process.env.FTB_MATERIAL_DELIVERIES_ENABLED!=='true' || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured())
    return NextResponse.json({error:'Entregas indisponíveis.'},{status:503})
  const admin=await requireAreaAdmin(request)
  if(!admin) return NextResponse.json({error:'Sem permissão.'},{status:403})
  try {
    const result=await confirmMaterialDelivery(getFirebaseAdminFirestore(),params.id,admin.uid,await request.json())
    if(result==='not-found') return NextResponse.json({error:'Entrega não encontrada.'},{status:404})
    if(result==='insufficient-stock') return NextResponse.json({error:'O stock mudou. Revê as quantidades.'},{status:409})
    if(['invalid-state','invalid-destination'].includes(result)) return NextResponse.json({error:'A entrega ou o destino não estão válidos.'},{status:409})
    return NextResponse.json({estado:'entregue',novaConfirmacao:result==='confirmed'})
  }catch(error){
    if(error instanceof MaterialDeliveryError||error instanceof SyntaxError) return NextResponse.json({error:error.message},{status:400})
    return NextResponse.json({error:'Não foi possível confirmar a entrega.'},{status:500})
  }
}
