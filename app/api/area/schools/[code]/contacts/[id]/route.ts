import {operationalActor} from '@/lib/server/operational-authorization'
import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isSchoolCode, parseSchoolContactInput, SchoolValidationError } from '@/lib/server/schools-validation.mjs'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { sealContact, openContact } from '@/lib/server/private-records.mjs'
import { appendAuditEvent } from '@/lib/server/audit-log.mjs'

export const runtime = 'nodejs'
const CONTACT_ID = /^[a-zA-Z0-9_-]{8,100}$/
async function context(request: Request, code: string, id: string, action:'update'|'delete') {
 if (!(await isOperationalModuleEnabled('schools')) || process.env.FTB_SCHOOLS_ENABLED !== 'true' || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured())
  return { error: NextResponse.json({error:'Módulo de escolas indisponível.'},{status:503}) }
 const admin = await operationalActor(request,'schools',action,code)
 if (!admin) return {error:NextResponse.json({error:'Acesso não autorizado.'},{status:403})}
 if (!isSchoolCode(code) || !CONTACT_ID.test(id)) return {error:NextResponse.json({error:'Identificador inválido.'},{status:400})}
 const db = getFirebaseAdminFirestore()
 const school=db.collection('area_schools').doc(code)
 const ref=school.collection('contactos').doc(id)
 return {admin,db,school,ref}
}
export async function PATCH(request:Request,{params}:{params:{code:string;id:string}}) {
 const ctx=await context(request,params.code?.toUpperCase(),params.id,'update')
 if ('error' in ctx) return ctx.error
 try {
  const raw=await request.json()
  const input=parseSchoolContactInput(raw)
  const result=await ctx.db.runTransaction(async tx=>{
   const [school,previous]=await Promise.all([tx.get(ctx.school),tx.get(ctx.ref)])
   if(!school.exists || !previous.exists)return false
   const now=new Date().toISOString()
   const updated={...sealContact(input,ctx.ref.path),updatedAt:now,updatedBy:ctx.admin.uid}
   tx.update(ctx.ref,updated)
   appendAuditEvent(tx,ctx.db,{module:'school-contacts',action:'update',recordPath:ctx.ref.path,actorUid:ctx.admin.uid,before:previous.data(),after:{...previous.data(),...updated},at:now})
   return true
  })
  if(!result)return NextResponse.json({error:'Responsável ou escola não encontrado.'},{status:404})
  return NextResponse.json({contacto:{id:ctx.ref.id,...input}})
 }catch(e){
  if(e instanceof SchoolValidationError || e instanceof SyntaxError)return NextResponse.json({error:e.message},{status:400})
  return NextResponse.json({error:'Não foi possível atualizar o responsável.'},{status:500})
 }
}
export async function DELETE(request:Request,{params}:{params:{code:string;id:string}}) {
 const ctx=await context(request,params.code?.toUpperCase(),params.id,'delete')
 if ('error' in ctx)return ctx.error
 try{
  const result=await ctx.db.runTransaction(async tx=>{
   const [school,previous]=await Promise.all([tx.get(ctx.school),tx.get(ctx.ref)])
   if(!school.exists || !previous.exists)return false
   const now=new Date().toISOString()
   tx.delete(ctx.ref)
   appendAuditEvent(tx,ctx.db,{module:'school-contacts',action:'delete',recordPath:ctx.ref.path,actorUid:ctx.admin.uid,before:previous.data(),at:now})
   return true
  })
  if(!result)return NextResponse.json({error:'Responsável ou escola não encontrado.'},{status:404})
  return NextResponse.json({success:true})
 }catch{return NextResponse.json({error:'Não foi possível eliminar o responsável.'},{status:500})}
}
