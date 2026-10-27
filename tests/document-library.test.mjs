import test from 'node:test';
import assert from 'node:assert/strict';
import { DocumentPolicyError, canUseDocument, nextDocumentVersion, reviewVersion,
  validateDocumentACL, validateDocumentDescriptor } from '../lib/server/document-library.mjs';
const grant={profiles:['document_reviewer'], schoolCodes:['ESC-001'], overrides:[]};
const acl={schoolCode:'ESC-001',userUids:['user_0001'],teamIds:['team_001']};
const actor={grant,actorUid:'user_0001',actorTeamIds:['team_001'],administrator:false};

test('deny by default, cross-school and no implicit public or external links',()=>{
  assert.equal(canUseDocument(actor,{classification:'internal'},acl,'read'),true);
  assert.equal(canUseDocument({...actor,actorUid:'outsider',actorTeamIds:[]}, {classification:'internal'},acl,'read'),false);
  assert.equal(canUseDocument(actor,{classification:'internal'},{...acl,schoolCode:'ESC-002'},'read'),false);
  assert.equal(canUseDocument(actor,{classification:'minor'},{...acl,userUids:[]},'read'),false);
  assert.equal(canUseDocument(actor,{classification:'minor'},acl,'read'),true);
  assert.equal(canUseDocument(actor,{classification:'internal'},acl,'delete'),false);
  assert.throws(()=>validateDocumentACL({teamIds:[],userUids:[]}),DocumentPolicyError);
});
test('document descriptor blocks dangerous MIME, pathname and oversize',()=>{
  const ok={name:'Relatório.pdf',mimeType:'application/pdf',size:2048,classification:'confidential',folderId:'folder_001'};
  assert.equal(validateDocumentDescriptor(ok).classification,'confidential');
  for(const changes of [{mimeType:'application/x-msdownload'},{name:'../secret.txt'},{size:26*1024*1024},{classification:'public'}])
    assert.throws(()=>validateDocumentDescriptor({...ok,...changes}),DocumentPolicyError);
});
test('new versions append immutable SHA-256 and refuse gaps or overwrite',()=>{
  const first=nextDocumentVersion([],{blob:Buffer.from('one'),storagePath:'private/documents/document_001/v1',actorUid:'user_0001',now:'2026-10-27T09:00:00.000Z'});
  assert.equal(first.version,1);
  assert.equal(first.sha256.length,64);
  const second=nextDocumentVersion([first],{blob:Buffer.from('two'),storagePath:'private/documents/document_001/v2',actorUid:'user_0001',now:'2026-10-27T09:01:00.000Z'});
  assert.equal(second.previousVersion,1);
  assert.notEqual(first.sha256,second.sha256);
  assert.throws(()=>nextDocumentVersion([first],{blob:Buffer.from('two'),storagePath:'private/documents/document_001/v1',actorUid:'user_0001',now:'2026-10-27T09:02:00.000Z'}),DocumentPolicyError);
});
test('review decisions are separate audit events, rejection needs reason',()=>{
  const base={version:3,status:'in_review'};
  assert.equal(reviewVersion(base,'approved','', 'reviewer_001','2026-10-27T09:00:00Z').decision,'approved');
  assert.throws(()=>reviewVersion(base,'rejected','no','reviewer_001','2026-10-27T09:00:00Z'),DocumentPolicyError);
  assert.equal(base.status,'in_review');
});
