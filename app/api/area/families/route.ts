import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured,encryptJson,decryptJson} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function auth(request:Request){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return {error:NextResponse.json({error:'Famílias indisponíveis.'},{status:503})}
 const actor=await requireAreaAdmin(request)
 return actor?{actor}:{error:NextResponse.json({error:'Sem permissão.'},{status:403})}
}
export async function GET(request:Request){
 const access=await auth(request);if('error' in access)return access.error
 try{
  const db=getFirebaseAdminFirestore(),docs=await db.collection('area_families').orderBy('createdAt','desc').limit(100).get()
  const families=docs.docs.map(d=>({id:d.id,...decryptJson(d.get('dadosPrivados'),d.ref.path+'#family-v1'),createdAt:d.get('createdAt')}))
  return NextResponse.json({families},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar famílias.'},{status:500})}
}
export async function POST(request:Request){
 const access=await auth(request);if('error' in access)return access.error
 try{
  const body=await request.json()
  const name=typeof body?.representante==='string'?body.representante.trim():''
  const community=typeof body?.comunidade==='string'?body.comunidade.trim():''
  if(name.length<2||name.length>140||community.length>140)return NextResponse.json({error:'Representante ou comunidade inválidos.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_families').doc(),stamp=new Date().toISOString()
  const doc={dadosPrivados:encryptJson({representante:name,comunidade:community},ref.path+'#family-v1'),createdAt:stamp,createdBy:access.actor!.uid,updatedAt:stamp}
  const batch=db.batch();batch.create(ref,doc);appendAuditEvent(batch,db,{module:'families',action:'create',recordPath:ref.path,actorUid:access.actor!.uid,after:doc,at:stamp});await batch.commit()
  return NextResponse.json({family:{id:ref.id,representante:name,comunidade:community}},{status:201})
 }catch{return NextResponse.json({error:'Não foi possível criar família.'},{status:500})}
}
