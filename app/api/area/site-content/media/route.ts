import { NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { getStorage,getDownloadURL } from 'firebase-admin/storage'
import { isFirebaseAdminConfigured,requireAreaAdmin,getFirebaseAdminFirestore } from '@/lib/server/firebase-admin'
import { writeExternalAudit } from '@/lib/server/audit-log.mjs'
import { validatePublicImage,MediaPolicyError,MAX_PUBLIC_MEDIA_BYTES,PUBLIC_MEDIA_FOLDERS } from '@/lib/server/public-media-policy.mjs'
export const runtime='nodejs'
const fail=(error:string,status:number)=>NextResponse.json({error},{status})
function bucket(){
 const name=process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
 if(!name||!/^[a-z0-9][a-z0-9.-]{5,150}$/.test(name))throw new Error('Storage não configurado.')
 return getStorage().bucket(name)
}
export async function POST(request:Request){
 if(!isFirebaseAdminConfigured())return fail('Serviço não configurado.',503)
 const admin=await requireAreaAdmin(request)
 if(!admin)return fail('Sem autorização.',403)
 const length=Number(request.headers.get('content-length')||'0')
 if(!Number.isFinite(length)||length>MAX_PUBLIC_MEDIA_BYTES+200000)return fail('Ficheiro demasiado grande.',413)
 try{
  const form=await request.formData(),file=form.get('file'),folder=form.get('folder')
  if(!(file instanceof File)||typeof folder!=='string'||file.size<1||file.size>MAX_PUBLIC_MEDIA_BYTES)return fail('Imagem inválida.',400)
  const blob=Buffer.from(await file.arrayBuffer())
  validatePublicImage(blob,file.type,folder)
  const extension=file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'
  const objectPath=folder+'/'+randomBytes(16).toString('hex')+'.'+extension
  const db=getFirebaseAdminFirestore(),path='firebase_storage/'+objectPath
  await writeExternalAudit(db,{module:'site-media',action:'upload',recordPath:path,actorUid:admin.uid,after:{mimeType:file.type,byteLength:blob.length},source:'storage-intent'})
  const fileRef=bucket().file(objectPath)
  await fileRef.save(blob,{resumable:false,contentType:file.type,preconditionOpts:{ifGenerationMatch:0},metadata:{cacheControl:'public,max-age=3600'}})
  const url=await getDownloadURL(fileRef)
  await writeExternalAudit(db,{module:'site-media',action:'upload',recordPath:path,actorUid:admin.uid,after:{mimeType:file.type,byteLength:blob.length},source:'storage-completed'})
  return NextResponse.json({url,path:objectPath},{status:201})
 }catch(e){
  if(e instanceof MediaPolicyError||e instanceof SyntaxError)return fail(e.message,400)
  return fail('Não foi possível carregar a imagem.',500)
 }
}
export async function DELETE(request:Request){
 if(!isFirebaseAdminConfigured())return fail('Serviço não configurado.',503)
 const admin=await requireAreaAdmin(request)
 if(!admin)return fail('Sem autorização.',403)
 try {
  const data=await request.json(),path=data?.path
  if(typeof path!=='string'||!new RegExp('^('+PUBLIC_MEDIA_FOLDERS.join('|')+')/[0-9a-f]{32}\\.(png|jpg|webp)$').test(path))return fail('Imagem não gerida por este módulo.',400)
  const db=getFirebaseAdminFirestore(),resource='firebase_storage/'+path
  await writeExternalAudit(db,{module:'site-media',action:'delete',recordPath:resource,actorUid:admin.uid,before:{present:true},source:'storage-intent'})
  await bucket().file(path).delete({ignoreNotFound:true})
  await writeExternalAudit(db,{module:'site-media',action:'delete',recordPath:resource,actorUid:admin.uid,source:'storage-completed'})
  return NextResponse.json({success:true})
 }catch{return fail('Não foi possível eliminar a imagem.',500)}
}
