import { NextResponse } from 'next/server'
import { getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin } from '@/lib/server/firebase-admin'
import { auditedCreate,auditedUpdate,auditedDelete } from '@/lib/server/audit-log.mjs'

export const runtime='nodejs'
const fields:Record<string,string[]>={
 noticias:['titulo','data','descricao','link','imagem','destaque'],
 membros:['nome','cargo','descricao','imagem'],
 parceiros:['nome','descricao','website','logo'],
 carrossel:['titulo','descricao','data','imagem','categoria'],
}
const isId=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z0-9_-]{8,128}$/.test(value)
const fail=(error:string,status:number)=>NextResponse.json({error},{status})
function validate(raw:unknown,collectionName:string){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Conteúdo inválido.')
 const data=raw as Record<string,unknown>,allow=fields[collectionName]
 if(Object.keys(data).length===0||Object.keys(data).some(k=>!allow.includes(k)))throw new Error('Campos não permitidos.')
 for(const [key,value] of Object.entries(data)){
  if(typeof value==='string'&&value.length<=5000)continue
  if(typeof value==='boolean'&&key==='destaque')continue
  throw new Error('Tipo ou dimensão do campo inválido.')
 }
 return data
}
async function checked(request:Request){
 if(!isFirebaseAdminConfigured())return null
 return requireAreaAdmin(request)
}
export async function POST(request:Request){
 const admin=await checked(request)
 if(!admin)return fail('Sem autorização.',403)
 try{
  const body=await request.json()
  if(!body||!Object.hasOwn(fields,body.collectionName))return fail('Coleção inválida.',400)
  const data=validate(body.data,body.collectionName)
  const db=getFirebaseAdminFirestore(),ref=db.collection(body.collectionName).doc(),now=new Date().toISOString()
  await auditedCreate(ref,{...data,createdAt:now,createdBy:admin.uid,updatedAt:now,updatedBy:admin.uid},{module:'site-content',actorUid:admin.uid})
  return NextResponse.json({id:ref.id},{status:201})
 }catch(error){if(error instanceof SyntaxError||error instanceof Error && error.message.includes('inválido')||error instanceof Error && error.message.includes('permitidos'))return fail(error.message,400);return fail('Não foi possível criar conteúdo.',500)}
}
export async function PATCH(request:Request){
 const admin=await checked(request)
 if(!admin)return fail('Sem autorização.',403)
 try{
  const body=await request.json()
  if(!body||!Object.hasOwn(fields,body.collectionName)||!isId(body.id))return fail('Coleção ou registo inválido.',400)
  const data=validate(body.data,body.collectionName)
  const ref=getFirebaseAdminFirestore().collection(body.collectionName).doc(body.id)
  const updated=await auditedUpdate(ref,{...data,updatedAt:new Date().toISOString(),updatedBy:admin.uid},{module:'site-content',actorUid:admin.uid})
  return updated?NextResponse.json({success:true}):fail('Registo não encontrado.',404)
 }catch(error){if(error instanceof SyntaxError||error instanceof Error && error.message.includes('inválido')||error instanceof Error && error.message.includes('permitidos'))return fail(error.message,400);return fail('Não foi possível atualizar conteúdo.',500)}
}
export async function DELETE(request:Request){
 const admin=await checked(request)
 if(!admin)return fail('Sem autorização.',403)
 try{
  const body=await request.json()
  if(!body||!Object.hasOwn(fields,body.collectionName)||!isId(body.id))return fail('Coleção ou registo inválido.',400)
  const ref=getFirebaseAdminFirestore().collection(body.collectionName).doc(body.id)
  const deleted=await auditedDelete(ref,{module:'site-content',actorUid:admin.uid})
  return deleted?NextResponse.json({success:true}):fail('Registo não encontrado.',404)
 }catch{return fail('Não foi possível eliminar conteúdo.',500)}
}
