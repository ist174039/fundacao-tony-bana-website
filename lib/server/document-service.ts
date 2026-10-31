import 'server-only'
import {documentBucketIsAcceptable,environmentReviewBlockers} from '@/lib/server/security-readiness.mjs'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isConfiguredAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { getStorage } from 'firebase-admin/storage'
import { canAccess, validateAccessGrant, EMPTY_ACCESS_GRANT } from '@/lib/server/access-grants.mjs'
import { canUseDocument } from '@/lib/server/document-library.mjs'
import { VALID_ID, openDocumentName } from '@/lib/server/document-workspace.mjs'

export const documentFeatureReady = () => process.env.FTB_DOCUMENTS_ENABLED === 'true' && isFieldEncryptionConfigured() && !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON && environmentReviewBlockers('documents').length===0
export function privateDocumentBucket() {
 const name=process.env.FTB_DOCUMENTS_BUCKET
 if(!documentBucketIsAcceptable({privateBucket:name,publicBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,sharedBucketReviewed:process.env.FTB_SHARED_DOCUMENTS_STORAGE_VERIFIED==='true'}))throw new Error('O bucket de documentos não está autorizado para armazenamento privado.')
 if(environmentReviewBlockers('documents').length>0)throw new Error('Revisão das regras de documentos não confirmada.')
 // Authenticated server operations only; never hand out Firebase download tokens or signed URLs.
 return getStorage().bucket(name)
}
export type DocumentActor={uid:string;admin:boolean;grant:{profiles:string[];schoolCodes:string[];overrides:unknown[]};teamIds:string[]}
export async function resolveDocumentActor(request: Request):Promise<DocumentActor|null>{
 if(!documentFeatureReady() || !(await isOperationalModuleEnabled('documents')))return null
 const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!token)return null
 try {
  const decoded=await getFirebaseAdminAuth().verifyIdToken(token,true)
  if(isConfiguredAreaAdmin(decoded))return {uid:decoded.uid,admin:true,grant:EMPTY_ACCESS_GRANT,teamIds:[]}
  if(process.env.FTB_GRANULAR_ACCESS_ENABLED!=='true')return null
  const db=getFirebaseAdminFirestore()
  const access=await db.collection('area_user_access').doc(decoded.uid).get()
  if(!access.exists)return null
  const grant=validateAccessGrant({profiles:access.get('profiles'),schoolCodes:access.get('schoolCodes'),overrides:access.get('overrides')})
  if(!canAccess(grant,'documents','read'))return null
  const teams=await db.collection('area_doc_teams').where('memberUids','array-contains',decoded.uid).limit(50).get()
  return {uid:decoded.uid,admin:false,grant,teamIds:teams.docs.map(x=>x.id)}
 }catch{return null}
}
export function canReadTeam(actor:DocumentActor,teamId:string){return VALID_ID.test(teamId)&&(actor.admin||actor.teamIds.includes(teamId)&&canAccess(actor.grant,'documents','read'))}
export function canWriteTeam(actor:DocumentActor,teamId:string,action:'create'|'update'|'delete'='create'){return VALID_ID.test(teamId)&&(actor.admin||actor.teamIds.includes(teamId)&&canAccess(actor.grant,'documents',action))}
export function canOperateDocument(actor:DocumentActor,doc:Record<string,any>,action:'read'|'create'|'update'|'approve'|'share'|'delete') {
 if(!actor.admin&&!actor.teamIds.includes(doc.teamId))return false
 return canUseDocument({grant:actor.grant,actorUid:actor.uid,actorTeamIds:actor.teamIds,administrator:actor.admin},doc,doc.acl,action)
}
export function documentView(ref:{id:string;path:string},raw:Record<string,any>) {
 return {id:ref.id,name:openDocumentName(raw,ref.path),teamId:raw.teamId,folderId:raw.folderId,classification:raw.classification,mimeType:raw.mimeType,latestVersion:raw.latestVersion,revision:Number(raw.revision||0),updatedAt:raw.updatedAt,createdAt:raw.createdAt,createdBy:raw.createdBy,acl:raw.acl}
}
export async function verifyMemberUids(uids:string[]){
 for(const uid of uids){try{await getFirebaseAdminAuth().getUser(uid)}catch{throw new Error('Utilizador de equipa inexistente: verifica os identificadores.') }}
}
