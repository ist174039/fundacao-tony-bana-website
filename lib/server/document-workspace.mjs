/** Teams-style private document workspace: folders, teams and guarded file types. */
import { encryptJson, decryptJson, EncryptedDataError } from './field-encryption.mjs';
import { validateDocumentACL, validateDocumentDescriptor, DocumentPolicyError } from './document-library.mjs';

export class DocumentWorkspaceError extends Error { constructor(message) { super(message); this.name='DocumentWorkspaceError'; } }
export const VALID_ID=/^[A-Za-z0-9_-]{3,128}$/;
export const MAX_FILE_SIZE=10*1024*1024;
const label=(value,tag,max=160)=>{
 if(typeof value!=='string'||value.trim().length<2||value.length>max||/[\u0000-\u001f/\\]/.test(value))throw new DocumentWorkspaceError(`${tag} inválido.`);
 return value.trim();
};
export function parseDocumentTeam(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new DocumentWorkspaceError('Equipa inválida.');
 if(!Array.isArray(raw.memberUids)||raw.memberUids.length>50||raw.memberUids.some(v=>typeof v!=='string'||!/^[A-Za-z0-9_-]{2,128}$/.test(v))||new Set(raw.memberUids).size!==raw.memberUids.length)
  throw new DocumentWorkspaceError('Membros inválidos.');
 return {name:label(raw.name,'Nome da equipa',140),memberUids:[...raw.memberUids].sort()};
}
export function parseDocumentFolder(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||!VALID_ID.test(raw.teamId)|| (raw.parentId!=null&&!VALID_ID.test(raw.parentId)))throw new DocumentWorkspaceError('Pasta ou equipa inválida.');
 return {name:label(raw.name,'Nome da pasta',140),teamId:raw.teamId,parentId:raw.parentId||null};
}
export function parseDocumentFolderRename(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>k!=='name'))
  throw new DocumentWorkspaceError('Pedido de alteração de pasta inválido.');
 return {name:label(raw.name,'Nome da pasta',140)};
}
const DOCUMENT_CLASSES = new Set(['internal','confidential','minor']);
export function parseDocumentEdit(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).some(k=>!['name','folderId','classification','expectedRevision'].includes(k))||
  !Number.isSafeInteger(raw.expectedRevision)||raw.expectedRevision<0||
  !VALID_ID.test(raw.folderId)||!DOCUMENT_CLASSES.has(raw.classification))
  throw new DocumentWorkspaceError('Pedido de edição inválido.');
 return {name:label(raw.name,'Nome do documento',180),folderId:raw.folderId,
  classification:raw.classification,expectedRevision:raw.expectedRevision};
}
export function parseDocumentStatusChange(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).some(k=>!['expectedRevision','reason'].includes(k))||
  !Number.isSafeInteger(raw.expectedRevision)||raw.expectedRevision<0||
  typeof raw.reason!=='string'||raw.reason.trim().length<8||raw.reason.length>500||
  /[\u0000-\u001f]/.test(raw.reason))
  throw new DocumentWorkspaceError('Indica uma justificação válida (mínimo de 8 caracteres).');
 return {expectedRevision:raw.expectedRevision,reason:raw.reason.trim()};
}
export function validateUploadBytes(blob,mime){
 if(!Buffer.isBuffer(blob)||blob.length<1||blob.length>MAX_FILE_SIZE)throw new DocumentWorkspaceError('Ficheiro demasiado grande ou vazio (limite 10 MB).');
 const first=blob.subarray(0,16);
 const begins=(value)=>first.subarray(0,value.length).equals(Buffer.from(value));
 const pdf=mime==='application/pdf'&&begins('%PDF-');
 const jpeg=mime==='image/jpeg'&&first[0]===0xff&&first[1]===0xd8&&first[2]===0xff;
 const png=mime==='image/png'&&first.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const webp=mime==='image/webp'&&first.subarray(0,4).toString()==='RIFF'&&first.subarray(8,12).toString()==='WEBP';
 const txt=mime==='text/plain'&&!blob.includes(0)&&!/<\s*(script|html|svg|iframe)\b/i.test(blob.toString('utf8',0,Math.min(1024,blob.length)));
 // Office files remain quarantined until antivirus scanning is installed; do not accept them yet.
 if(![pdf,jpeg,png,webp,txt].some(Boolean))throw new DocumentWorkspaceError('Formato não autorizado ou assinatura incompatível. Apenas PDF, imagens e texto em TEST.');
 return true;
}
export function parseFileUpload({name,mimeType,blob,folderId,classification}){
 if(!VALID_ID.test(folderId))throw new DocumentWorkspaceError('Pasta inválida.');
 const descriptor=validateDocumentDescriptor({name,mimeType,size:blob.length,classification,folderId});
 validateUploadBytes(blob,mimeType);
 return descriptor;
}
export function sealDocumentName(name,path){return encryptJson({name:label(name,'Nome do documento',180)},path+'#document')}
export function openDocumentName(doc,path){
 if(!doc?.dadosPrivados)throw new EncryptedDataError();
 const payload=decryptJson(doc.dadosPrivados,path+'#document');
 if(typeof payload?.name!=='string')throw new EncryptedDataError();
 return payload.name;
}
export function buildDocumentAcl(teamId,actorUid,classification){
 if(!VALID_ID.test(teamId)||!VALID_ID.test(actorUid))throw new DocumentWorkspaceError('Destinatários inválidos.');
 return validateDocumentACL({userUids:[actorUid],teamIds:[teamId]});
}
export function sanitizeShareAcl(value,doc){
 const acl=validateDocumentACL(value);
 // A document always belongs to the team that owns its folder; no horizontal or external sharing in the pilot.
 if(acl.schoolCode!==null||acl.teamIds.length!==1||acl.teamIds[0]!==doc.teamId)throw new DocumentPolicyError('Partilha apenas com membros da equipa de origem.');
 if(doc.classification!=='internal'&&acl.userUids.length===0)throw new DocumentPolicyError('Documentos confidenciais exigem utilizadores explícitos.');
 return acl;
}
