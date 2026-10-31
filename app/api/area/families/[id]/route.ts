import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured,encryptJson,decryptJson} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Famílias indisponíveis.'},{status:503})
 const admin=await requireAreaAdmin(request)
 if(!admin)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Família inválida.'},{status:400})
 try{
  const body=await request.json()
  const representante=typeof body?.representante==='string'?body.representante.trim():''
  const comunidade=typeof body?.comunidade==='string'?body.comunidade.trim():''
  if(representante.length<2||representante.length>140||comunidade.length>140)return NextResponse.json({error:'Dados inválidos.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_families').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const existing=await tx.get(ref)
   if(!existing.exists)return false
   const old=decryptJson(existing.get('dadosPrivados'),ref.path+'#family-v1')
   const at=new Date().toISOString(),after={...existing.data(),dadosPrivados:encryptJson({...old,representante,comunidade},ref.path+'#family-v1'),updatedAt:at,updatedBy:admin.uid}
   tx.update(ref,{dadosPrivados:after.dadosPrivados,updatedAt:at,updatedBy:admin.uid})
   appendAuditEvent(tx,db,{module:'families',action:'update',recordPath:ref.path,actorUid:admin.uid,before:existing.data(),after,at})
   return true
  })
  return result?NextResponse.json({family:{id:params.id,representante,comunidade}}):NextResponse.json({error:'Família inexistente.'},{status:404})
 }catch{return NextResponse.json({error:'Não foi possível atualizar agregado.'},{status:500})}
}
