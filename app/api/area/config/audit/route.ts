import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth,getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin } from '@/lib/server/firebase-admin'
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
  const actorUids=[...new Set(events.map(e=>e.actorUid).filter((id):id is string=>typeof id==='string'&&id.length>0))]
  const names=new Map<string,string>()
  for(let i=0;i<actorUids.length;i+=100){
   const ids=actorUids.slice(i,i+100)
   try{const result=await getFirebaseAdminAuth().getUsers(ids.map(uid=>({uid})));for(const user of result.users)if(user.displayName?.trim())names.set(user.uid,user.displayName.trim())}catch{ /* A falha na resolução de nomes não bloqueia a auditoria. */ }
  }
  const resolved=events.map(e=>({...e,actorName:names.get(e.actorUid)||'Utilizador não identificado'}))
  return NextResponse.json({events:resolved,limitedTo:250},{headers:{'Cache-Control':'private, no-store'}})
 }catch{return NextResponse.json({error:'Não foi possível consultar a auditoria.'},{status:503})}
}
