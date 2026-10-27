import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { parseStudentInput } from '../lib/server/student-registry.mjs';
import { sealStudent, openStudent, studentDocumentId, isStudentIndexConfigured } from '../lib/server/student-private.mjs';
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON=JSON.stringify({unit:randomBytes(32).toString('base64')});
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID='unit';
process.env.FTB_STUDENT_INDEX_KEY_B64=randomBytes(32).toString('base64');
const fixture=parseStudentInput({codigoInterno:'ALU-023',escolaCodigo:'ESC-001',nome:'Aluno fictício',responsavelNome:'Pessoa fictícia',responsavelEmail:'guardian@example.invalid',anoLetivo:'2026/2027'});
test('não persiste nomes, contactos ou código interno em claro',()=>{
 const path='area_students/'+studentDocumentId(fixture.escolaCodigo,fixture.codigoInterno); const stored=sealStudent(fixture,path);
 for(const text of ['Aluno fictício','Pessoa fictícia','guardian@example.invalid','ALU-023']) assert.ok(!JSON.stringify(stored).includes(text));
 assert.equal(openStudent(stored,path).responsavelNome,'Pessoa fictícia');
 assert.throws(()=>openStudent(stored,path+'wrong'));assert.ok(!('nome' in stored));
});
test('o índice HMAC usa o contexto da escola e exige segredo',()=>{
 assert.equal(isStudentIndexConfigured(),true);
 assert.notEqual(studentDocumentId('ESC-001','ALU-023'),studentDocumentId('ESC-002','ALU-023'));
 const prev=process.env.FTB_STUDENT_INDEX_KEY_B64; delete process.env.FTB_STUDENT_INDEX_KEY_B64;
 assert.equal(isStudentIndexConfigured(),false);assert.throws(()=>studentDocumentId('ESC-001','ALU-023'));
 process.env.FTB_STUDENT_INDEX_KEY_B64=prev;
});
