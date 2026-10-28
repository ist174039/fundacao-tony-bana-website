import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured()||!(await isOperationalModuleEnabled('students'))||!(await isOperationalModuleEnabled('deliveries')))return NextResponse.json({error:'Indicadores indisponíveis.'},{status:503})
 if(!(await requireAreaAdmin(request)))return NextResponse.json({error:'Sem permissão.'},{status:403})
 try{
  const db=getFirebaseAdminFirestore()
  const keys=['area_students','area_families','area_family_assessments','area_material_deliveries','area_material_stock_lots','area_schools']
  const counts=await Promise.all(keys.map(key=>db.collection(key).count().get()))
  const out=Object.fromEntries(keys.map((key,i)=>[key,counts[i].data().count]))
  const deliveries=await db.collection('area_material_deliveries').orderBy('criadoEm','desc').limit(200).get()
  const statuses={pendente:0,entregue:0,cancelada:0}
  for(const doc of deliveries.docs){const status=doc.get('estado');if(status in statuses)statuses[status as keyof typeof statuses]++}
  return NextResponse.json({counts:{students:out.area_students,families:out.area_families,assessments:out.area_family_assessments,deliveries:out.area_material_deliveries,stockLots:out.area_material_stock_lots,schools:out.area_schools},recentDeliveryStatuses:statuses,deliverySampleSize:deliveries.size},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível calcular indicadores.'},{status:500})}
}
