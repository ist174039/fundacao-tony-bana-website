import {NextResponse} from 'next/server'
import {getFirebaseAdminAuth,isFirebaseAdminConfigured} from '@/lib/server/firebase-admin'
import {operationalActor} from '@/lib/server/operational-authorization'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:'Utilizadores indisponíveis.'},{status:503})
 const access=await operationalActor(request,'assessments','read')
 if(!access)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!access.admin&&!access.grant.schoolCodes.length)return NextResponse.json({error:'Âmbito escolar obrigatório.'},{status:403})
 try{
  const users=await getFirebaseAdminAuth().listUsers(1000)
  return NextResponse.json({users:users.users.filter(u=>!u.disabled).map(u=>({uid:u.uid,displayName:u.displayName||u.email||'Utilizador',email:'',disabled:false}))},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Falha ao consultar voluntários.'},{status:500})}
}
