import {NextResponse} from 'next/server'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {openStockLot} from '@/lib/server/material-delivery.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const fail=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}})
export async function GET(request:Request){
 if(!(await isOperationalModuleEnabled('material'))||process.env.FTB_MATERIAL_DONATIONS_ENABLED!=='true')return fail('Stock indisponível na Configuração.',503)
 if(!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return fail('Cifragem ou serviço indisponíveis.',503)
 if(!(await requireAreaAdmin(request)))return fail('Sem permissão.',403)
 try{
  const docs=await getFirebaseAdminFirestore().collection('area_material_stock_lots').limit(501).get()
  const truncated=docs.size>500
  const lotes=docs.docs.slice(0,500).map(d=>{
   const detail=openStockLot(d.data(),d.ref.path)
   return {id:d.id,...detail,atualizadoEm:d.get('atualizadoEm')||null}
  })
  return NextResponse.json({lotes,truncated,limit:500},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return fail('Não foi possível consultar o stock.',500)}
}
