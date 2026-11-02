import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured,encryptJson} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'

export const runtime='nodejs'
async function authorize(request:Request){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return {error:NextResponse.json({error:'Famílias indisponíveis.'},{status:503})}
 const actor=await requireAreaAdmin(request)
 return actor?{actor}:{error:NextResponse.json({error:'Sem permissão.'},{status:403})}
}

export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const access=await authorize(request);if('error' in access)return access.error
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Agregado inválido.'},{status:400})
 try{
  const body=await request.json(),representante=typeof body?.representante==='string'?body.representante.trim():'',comunidade=typeof body?.comunidade==='string'?body.comunidade.trim():''
  if(representante.length<2||representante.length>140||comunidade.length>140)return NextResponse.json({error:'Representante ou comunidade inválidos.'},{status:400})
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_families').doc(params.id)
  const result=await db.runTransaction(async tx=>{
   const current=await tx.get(ref)
   if(!current.exists||current.get('archivedAt'))return 'missing'
   const at=new Date().toISOString(),next={dadosPrivados:encryptJson({representante,comunidade},ref.path+'#family-v1'),updatedAt:at,updatedBy:access.actor!.uid}
   tx.update(ref,next)
   appendAuditEvent(tx,db,{module:'families',action:'update',recordPath:ref.path,actorUid:access.actor!.uid,before:current.data(),after:{...current.data(),...next},at})
   return 'updated'
  })
  return result==='missing'?NextResponse.json({error:'Agregado inexistente.'},{status:404}):NextResponse.json({family:{id:params.id,representante,comunidade}})
 }catch{return NextResponse.json({error:'Não foi possível atualizar o agregado.'},{status:500})}
}

export async function DELETE(request:Request,{params}:{params:{id:string}}){
 const access=await authorize(request);if('error' in access)return access.error
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Agregado inválido.'},{status:400})
 try{
  const db=getFirebaseAdminFirestore(),ref=db.collection('area_families').doc(params.id),linkQuery=db.collection('area_family_student_links').where('familyId','==',params.id)
  const result=await db.runTransaction(async tx=>{
   const current=await tx.get(ref),links=await tx.get(linkQuery)
   if(!current.exists)return 'missing'
   if(current.get('archivedAt'))return 'archived'
   if(!links.empty)return 'has-members'
   const at=new Date().toISOString(),change={archivedAt:at,archivedBy:access.actor!.uid,updatedAt:at,updatedBy:access.actor!.uid}
   tx.update(ref,change)
   appendAuditEvent(tx,db,{module:'families',action:'delete',recordPath:ref.path,actorUid:access.actor!.uid,before:current.data(),after:{...current.data(),...change},at})
   return 'archived'
  })
  if(result==='missing')return NextResponse.json({error:'Agregado inexistente.'},{status:404})
  if(result==='has-members')return NextResponse.json({error:'Este agregado ainda tem alunos associados. Remove primeiro os vínculos individuais.'},{status:409})
  return NextResponse.json({status:'archived'})
 }catch{return NextResponse.json({error:'Não foi possível arquivar o agregado.'},{status:500})}
}
