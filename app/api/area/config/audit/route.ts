import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth,getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin } from '@/lib/server/firebase-admin'
import { AUDIT_COLLECTION } from '@/lib/server/audit-log.mjs'
import {resolveAuditActor} from '@/lib/server/audit-actor.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request:Request){
 if(!isFirebaseAdminConfigured())return NextResponse.json({error:'Auditoria indisponível.'},{status:503})
 const admin=await requireAreaAdmin(request)
 if(!admin)return NextResponse.json({error:'Acesso reservado ao administrador.'},{status:403})
 try{
  const snap=await getFirebaseAdminFirestore().collection(AUDIT_COLLECTION).orderBy('at','desc').limit(250).get()
  const events=snap.docs.map(d=>{const x=d.data();return {id:d.id,module:x.module,action:x.action,recordPath:x.recordPath,actorUid:x.actorUid,at:x.at,changedFields:x.changedFields||[],snapshotProtected:x.snapshotProtected===true,snapshotAvailable:x.snapshotAvailable===true,source:x.source}})
  // Batch lookup (up to 100 users per Firebase Auth call), without storing names in immutable events.
  const unique=[...new Set(events.map(e=>e.actorUid).filter(uid=>typeof uid==='string'&&uid!=='anonymous'))]
  const byUid=new Map<string,{displayName?:string|null;email?:string|null}>()
  for(let i=0;i<unique.length;i+=100){
   try{
    const data=await getFirebaseAdminAuth().getUsers(unique.slice(i,i+100).map(uid=>({uid})))
    for(const user of data.users)byUid.set(user.uid,{displayName:user.displayName,email:user.email})
   }catch{console.error('[audit] User display-name lookup temporarily unavailable')}
  }
  return NextResponse.json({events:events.map(e=>({...e,...resolveAuditActor(e.actorUid,byUid.get(e.actorUid))})),limitedTo:250},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar a auditoria.'},{status:503})}
}
