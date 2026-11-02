import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured,requireAreaAdmin} from '@/lib/server/firebase-admin'
import {isFieldEncryptionConfigured,encryptJson,decryptJson} from '@/lib/server/field-encryption.mjs'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export const dynamic='force-dynamic'
const MAX_FAMILY_SEARCH_SCAN=500
async function auth(request:Request){
 if(!(await isOperationalModuleEnabled('students'))||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return {error:NextResponse.json({error:'Famílias indisponíveis.'},{status:503})}
 const actor=await requireAreaAdmin(request)
 return actor?{actor}:{error:NextResponse.json({error:'Sem permissão.'},{status:403})}
}
export async function GET(request:Request){
 const access=await auth(request);if('error' in access)return access.error
 try{
  const db=getFirebaseAdminFirestore(),url=new URL(request.url),familyId=url.searchParams.get('id')
  const pageSize=Math.min(20,Math.max(1,Number(url.searchParams.get('pageSize'))||20))
  const page=Math.max(1,Number(url.searchParams.get('page'))||1)
  if(familyId){
   if(!/^[A-Za-z0-9]{12,40}$/.test(familyId))return NextResponse.json({error:'Agregado inválido.'},{status:400})
   const ref=db.collection('area_families').doc(familyId),family=await ref.get()
   if(!family.exists||family.get('archivedAt'))return NextResponse.json({error:'Agregado inexistente.'},{status:404})
   const memberPageSize=Math.min(50,Math.max(1,Number(url.searchParams.get('memberPageSize'))||10))
   const memberPage=Math.max(1,Number(url.searchParams.get('memberPage'))||1)
   const linksQuery=db.collection('area_family_student_links').where('familyId','==',familyId)
   const linkCount=await linksQuery.count().get()
   const memberPages=Math.max(1,Math.ceil(linkCount.data().count/memberPageSize)),currentMemberPage=Math.min(memberPage,memberPages)
   const links=await linksQuery.orderBy('studentId').offset((currentMemberPage-1)*memberPageSize).limit(memberPageSize).get()
   const members=await Promise.all(links.docs.map(async link=>{
    const studentRef=db.collection('area_students').doc(link.get('studentId'))
    const student=await studentRef.get()
    if(!student.exists)return null
    if(student.get('archivedAt'))return {id:student.id,nome:'Aluno arquivado',escolaCodigo:'',estado:'arquivado',archived:true}
    const value=decryptJson(student.get('dadosPrivados'),studentRef.path+'#student-v1')
    return {id:student.id,nome:typeof value?.nome==='string'?value.nome:'Aluno',escolaCodigo:student.get('escolaCodigo')||'',estado:student.get('estado')||'ativo',archived:false}
   }))
   const totalMembers=linkCount.data().count
   return NextResponse.json({family:{id:family.id,...decryptJson(family.get('dadosPrivados'),ref.path+'#family-v1')},members:members.filter(Boolean),memberPage:currentMemberPage,memberPageSize,totalMembers,memberPages},{headers:{'Cache-Control':'private, no-store'}})
  }
  const scan=await db.collection('area_families').orderBy('createdAt','desc').limit(MAX_FAMILY_SEARCH_SCAN+1).get()
  const truncated=scan.docs.length>MAX_FAMILY_SEARCH_SCAN
  const term=(url.searchParams.get('search')||'').trim().slice(0,120).toLocaleLowerCase('pt-PT')
  const filtered=scan.docs.slice(0,MAX_FAMILY_SEARCH_SCAN).filter(d=>!d.get('archivedAt')).map(d=>({id:d.id,...decryptJson(d.get('dadosPrivados'),d.ref.path+'#family-v1'),createdAt:d.get('createdAt')}))
   .filter(f=>!term||`${f.representante} ${f.comunidade}`.toLocaleLowerCase('pt-PT').includes(term))
  const total=filtered.length,pages=Math.max(1,Math.ceil(total/pageSize)),currentPage=Math.min(page,pages)
  const pageFamilies=filtered.slice((currentPage-1)*pageSize,currentPage*pageSize)
  const families=await Promise.all(pageFamilies.map(async family=>{
   const count=await db.collection('area_family_student_links').where('familyId','==',family.id).count().get()
   return {...family,memberCount:count.data().count}
  }))
  return NextResponse.json({families,page:currentPage,pageSize,total,pages,truncated},{headers:{'Cache-Control':'private, no-store'}})
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
  const doc={dadosPrivados:encryptJson({representante:name,comunidade:community},ref.path+'#family-v1'),createdAt:stamp,createdBy:access.actor!.uid,updatedAt:stamp,updatedBy:access.actor!.uid}
  const batch=db.batch();batch.create(ref,doc);appendAuditEvent(batch,db,{module:'families',action:'create',recordPath:ref.path,actorUid:access.actor!.uid,after:doc,at:stamp});await batch.commit()
  return NextResponse.json({family:{id:ref.id,representante:name,comunidade:community}},{status:201})
 }catch{return NextResponse.json({error:'Não foi possível criar família.'},{status:500})}
}
