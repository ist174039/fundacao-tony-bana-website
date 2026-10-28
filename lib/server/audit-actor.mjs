export function resolveAuditActor(uid,user){
 if(uid==='anonymous')return {actorName:'Anónimo',actorEmail:null}
 if(!user)return {actorName:'Utilizador não identificado',actorEmail:null}
 const displayName=typeof user.displayName==='string'?user.displayName.trim():''
 const email=typeof user.email==='string'?user.email.trim().toLowerCase():''
 return {actorName:displayName||email||'Utilizador sem nome',actorEmail:email||null}
}
