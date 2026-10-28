import 'server-only'
import {getFirebaseAdminAuth,getFirebaseAdminFirestore,isConfiguredAreaAdmin} from './firebase-admin'
import {canAccess,validateAccessGrant,EMPTY_ACCESS_GRANT} from './access-grants.mjs'
export type AuthorizedActor={uid:string;admin:boolean;grant:{profiles:string[];schoolCodes:string[];overrides:Array<{module:string;action:string;allow:boolean}>}}
export async function operationalActor(request:Request,module:string,action:string,schoolCode?:string):Promise<AuthorizedActor|null>{
 const bearer=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')
 if(!bearer)return null
 try {
  const identity=await getFirebaseAdminAuth().verifyIdToken(bearer,true)
  if(isConfiguredAreaAdmin(identity))return {uid:identity.uid,admin:true,grant:{profiles:[],schoolCodes:[],overrides:[]}}
  if(process.env.FTB_GRANULAR_ACCESS_ENABLED!=='true')return null
  const doc=await getFirebaseAdminFirestore().collection('area_user_access').doc(identity.uid).get()
  if(!doc.exists)return null
  const grant=validateAccessGrant({profiles:doc.get('profiles'),schoolCodes:doc.get('schoolCodes'),overrides:doc.get('overrides')})
  if(!canAccess(grant,module,action,{schoolBound:!!schoolCode,schoolCode:schoolCode||null}))return null
  if((module==='students'||module==='schools')&&!schoolCode&&!grant.schoolCodes.length)return null
  return {uid:identity.uid,admin:false,grant}
 }catch{return null}
}
export function permittedSchool(actor:AuthorizedActor,code:string){
 return actor.admin||actor.grant.schoolCodes.includes(code)
}
