import {NextResponse} from 'next/server'
import {getFirebaseAdminFirestore,isFirebaseAdminConfigured} from '@/lib/server/firebase-admin'
import {operationalActor} from '@/lib/server/operational-authorization'
import {isOperationalModuleEnabled} from '@/lib/server/module-settings'
import {isFieldEncryptionConfigured} from '@/lib/server/field-encryption.mjs'
import {parseMaterialReception,MaterialReceptionError} from '@/lib/server/material-reception.mjs'
import {sealMaterialReception} from '@/lib/server/private-records.mjs'
import {appendAuditEvent} from '@/lib/server/audit-log.mjs'
export const runtime='nodejs'
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 if(!(await isOperationalModuleEnabled('material'))||process.env.FTB_MATERIAL_DONATIONS_ENABLED!=='true'||!isFirebaseAdminConfigured()||!isFieldEncryptionConfigured())return NextResponse.json({error:'Doações indisponíveis.'},{status:503})
 const actor=await operationalActor(request,'donations','update')
 if(!actor)return NextResponse.json({error:'Sem permissão.'},{status:403})
 if(!/^[A-Za-z0-9]{12,40}$/.test(params.id))return NextResponse.json({error:'Identificador inválido.'},{status:400})
 try{
 const input=parseMaterialReception(await request.json()),db=getFirebaseAdminFirestore(),ref=db.collection('area_material_receptions').doc(params.id)
 const result=await db.runTransaction(async tx=>{
  const old=await tx.get(ref)
  if(!old.exists)return 'missing'
  if(old.get('estado')!=='pendente')return 'locked'
  const at=new Date().toISOString(),after={...old.data(),...sealMaterialReception(input,ref.path),atualizadoEm:at,atualizadoPor:actor.uid}
  tx.update(ref,{...sealMaterialReception(input,ref.path),atualizadoEm:at,atualizadoPor:actor.uid})
  appendAuditEvent(tx,db,{module:'material-receptions',action:'update',recordPath:ref.path,actorUid:actor.uid,before:old.data(),after,at})
  return 'updated'
 })
 return result==='missing'?NextResponse.json({error:'Doação não encontrada.'},{status:404}):result==='locked'?NextResponse.json({error:'Doação confirmada não é editável. Regista um ajuste auditado.'},{status:409}):NextResponse.json({success:true})
 }catch(e){return e instanceof MaterialReceptionError||e instanceof SyntaxError?NextResponse.json({error:e.message},{status:400}):NextResponse.json({error:'Não foi possível editar a doação.'},{status:500})}
}
