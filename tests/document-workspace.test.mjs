import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { parseDocumentTeam,parseDocumentFolder,parseDocumentFolderRename,validateUploadBytes,parseFileUpload,sealDocumentName,openDocumentName,buildDocumentAcl,sanitizeShareAcl } from '../lib/server/document-workspace.mjs';
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({test:randomBytes(32).toString('base64')});
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='test';
const pdf=Buffer.from('%PDF-1.7\n 0 1 obj\n');
test('Teams-style groups validate members and never accept duplicates or path injection',()=>{
 assert.deepEqual(parseDocumentTeam({name:'Equipa Educação',memberUids:['user_B01','user_A01']}).memberUids,['user_A01','user_B01']);
 assert.throws(()=>parseDocumentTeam({name:'Teste',memberUids:['user_A01','user_A01']}));
 assert.throws(()=>parseDocumentFolder({name:'../private',teamId:'team_001'}));
 assert.equal(parseDocumentFolder({name:'Relatórios',teamId:'team_001'}).parentId,null);
});
test('server checks actual file signatures and does not accept Office/HTML without antivirus',()=>{
 assert.ok(validateUploadBytes(pdf,'application/pdf'));
 assert.throws(()=>validateUploadBytes(pdf,'image/png'));
 assert.throws(()=>validateUploadBytes(Buffer.from('<html>bad</html>'),'text/plain'));
 assert.throws(()=>validateUploadBytes(Buffer.from('PK\x03\x04'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
 assert.throws(()=>parseFileUpload({name:'../x.pdf',mimeType:'application/pdf',blob:pdf,folderId:'folder_01',classification:'internal'}));
 assert.equal(parseFileUpload({name:'Relatório.pdf',mimeType:'application/pdf',blob:pdf,folderId:'folder_01',classification:'internal'}).mimeType,'application/pdf');
});
test('document filenames are encrypted and bound to document path',()=>{
 const data=sealDocumentName('Relatório individual','area_doc_files/document_A01');
 assert.equal(JSON.stringify(data).includes('Relatório individual'),false);
 assert.equal(openDocumentName({dadosPrivados:data},'area_doc_files/document_A01'),'Relatório individual');
 assert.throws(()=>openDocumentName({dadosPrivados:data},'area_doc_files/document_B02'));
});
test('sharing never crosses teams and confidential files require named users',()=>{
 const d={teamId:'team_001',classification:'confidential'};
 assert.deepEqual(buildDocumentAcl('team_001','user_001','internal').teamIds,['team_001']);
 assert.throws(()=>sanitizeShareAcl({teamIds:['team_002'],userUids:['user_001']},d));
 assert.throws(()=>sanitizeShareAcl({teamIds:['team_001'],userUids:[]},d));
 assert.equal(sanitizeShareAcl({teamIds:['team_001'],userUids:['user_001']},d).userUids[0],'user_001');
});

test('folder rename only accepts a valid name and never changes its team or parent',()=>{
 assert.deepEqual(parseDocumentFolderRename({name:'  Novos Documentos  '}),{name:'Novos Documentos'});
 assert.throws(()=>parseDocumentFolderRename({name:''}),/Nome da pasta inválido/);
 assert.throws(()=>parseDocumentFolderRename({name:'A'}),/Nome da pasta inválido/);
 assert.throws(()=>parseDocumentFolderRename({name:'Relatórios',teamId:'other-team'}),/Pedido de alteração/);
 assert.throws(()=>parseDocumentFolderRename({name:'Raiz/../privado'}),/Nome da pasta inválido/);
});
