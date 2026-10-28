import {NextResponse} from 'next/server'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('material'))||process.env.FTB_MATERIAL_DONATIONS_ENABLED!=='true')
  return NextResponse.json({error:'Stock indisponível.'},{status:503})
 if(!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Serviço indisponível.'},{status:503})
 if(!(await requireAreaAdmin(request)))return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(params.id))return NextResponse.json({error:'Lote inválido.'},{status:400})
 try{
  const db=getFirebaseAdminFirestore()
  const lot=await db.collection('area_material_stock_lots').doc(params.id).get()
  if(!lot.exists)return NextResponse.json({error:'Lote não encontrado.'},{status:404})
  const s=await db.collection('area_material_stock_movements').where('loteId','==',params.id).limit(201).get()
  const truncated=s.size>200
  const movimentos=s.docs.slice(0,200).map(d=>({id:d.id,tipo:d.get('tipo'),quantidade:d.get('quantidade'),unidade:d.get('unidade'),criadoEm:d.get('criadoEm'),criadoPor:d.get('criadoPor'),rececaoId:d.get('rececaoId')||null,entregaId:d.get('entregaId')||null}))
   .sort((a,b)=>String(b.criadoEm).localeCompare(String(a.criadoEm)))
  return NextResponse.json({movimentos,truncated},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar movimentos.'},{status:500})}
}
