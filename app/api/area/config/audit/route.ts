import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin } from '@/lib/server/firebase-admin'
import { AUDIT_COLLECTION } from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:'Auditoria indisponível.'},{status:503})
 const admin=await requireAreaAdmin(request)
 if(!admin)return NextResponse.json({error:'Acesso reservado ao administrador.'},{status:403})
 try{
  const snap=await getFirebaseAdminFirestore().collection(AUDIT_COLLECTION).orderBy('at','desc').limit(250).get()
  const events=snap.docs.map(d=>{const x=d.data();return {id:d.id,module:x.module,action:x.action,recordPath:x.recordPath,actorUid:x.actorUid,at:x.at,changedFields:x.changedFields||[],snapshotProtected:x.snapshotProtected===true,snapshotAvailable:x.snapshotAvailable===true,source:x.source}})
  return NextResponse.json({events,limitedTo:250},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar a auditoria.'},{status:503})}
}
