import {NextResponse} from 'next/server'
import {getFirebaseAdminAuth,getFirebaseAdminFirestore,isConfiguredAreaAdmin,isFirebaseAdminConfigured} from '@/lib/server/firebase-admin'
import {listModuleStatuses} from '@/lib/server/module-settings'
import {canAccess,validateAccessGrant,EMPTY_ACCESS_GRANT} from '@/lib/server/access-grants.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:'Acessos indisponíveis.'},{status:503})
 const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return NextResponse.json({error:'Sem sessão.'},{status:401})
 try{
  const user=await getFirebaseAdminAuth().verifyIdToken(token,true),admin=isConfiguredAreaAdmin(user)
  if(!admin&&process.env.FTB_GRANULAR_ACCESS_ENABLED!=='true')return NextResponse.json({error:'Sem permissão.'},{status:403})
  const doc=admin?null:await getFirebaseAdminFirestore().collection('area_user_access').doc(user.uid).get()
  const grant=admin?EMPTY_ACCESS_GRANT:doc?.exists?validateAccessGrant({profiles:doc.get('profiles'),schoolCodes:doc.get('schoolCodes'),overrides:doc.get('overrides')}):EMPTY_ACCESS_GRANT
  const states=await listModuleStatuses()
  const scope=(module:string)=>admin||!['schools','students'].includes(module)||grant.schoolCodes.length>0
  const access=Object.fromEntries(['schools','students','donations','stock','deliveries','documents','finance','families','assessments','visits','reports'].map(m=>[m,Object.fromEntries(['read','create','update','change_status','approve','delete','share'].map(action=>[action,admin||scope(m)&&canAccess(grant,m,action)]))]))
  const operational={schools:'schools',students:'students',material:'donations',deliveries:'deliveries',documents:'documents'}
  const modules=Object.fromEntries(Object.entries(operational).map(([id,permission])=>[id,states.some(s=>s.id===id&&s.enabled)&&access[permission].read]))
  return NextResponse.json({admin,modules,access},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível verificar permissões.'},{status:503})}
}
