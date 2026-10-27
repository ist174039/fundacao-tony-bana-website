/**
 * FTB-DOC-001/002/003/006/007: policy, immutable version metadata and ACLs.
 * Storage adapter is intentionally NOT included: no uploads or public signed
 * URLs until private Storage rules, scanning and audit have been verified.
 */
import { createHash } from 'node:crypto';
import { canAccess } from './access-grants.mjs';

export class DocumentPolicyError extends Error {
  constructor(message) { super(message); this.name = 'DocumentPolicyError' }
}
const TYPES = new Set(['application/pdf','image/jpeg','image/png','image/webp','text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
const STATUSES = new Set(['draft','in_review','approved','rejected','archived']);
const CLASSES = new Set(['internal','confidential','minor']);
const ACTIONS = new Set(['read','create','update','approve','share','delete']);
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{3,128}$/.test(value);

export function validateDocumentDescriptor(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new DocumentPolicyError('Documento inválido.');
  if (typeof raw.name !== 'string' || raw.name.trim().length < 2 || raw.name.length > 180 || /[\\/\u0000-\u001f]/.test(raw.name)) {
    throw new DocumentPolicyError('Nome de documento inválido.');
  }
  if (!TYPES.has(raw.mimeType) || !Number.isInteger(raw.size) || raw.size < 1 || raw.size > 25 * 1024 * 1024) {
    throw new DocumentPolicyError('Formato ou tamanho não autorizado.');
  }
  if (!CLASSES.has(raw.classification) || !id(raw.folderId)) throw new DocumentPolicyError('Classificação ou pasta inválidas.');
  return { name: raw.name.trim(), mimeType: raw.mimeType, size: raw.size,
    classification: raw.classification, folderId: raw.folderId };
}

export function validateDocumentACL(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new DocumentPolicyError('Partilha inválida.');
  const { schoolCode = null, userUids = [], teamIds = [] } = raw;
  if (schoolCode !== null && (typeof schoolCode !== 'string' || !/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(schoolCode))) throw new DocumentPolicyError('Escola inválida.');
  if (![userUids,teamIds].every(arr => Array.isArray(arr) && arr.length <= 50 && arr.every(id) && new Set(arr).size === arr.length)) {
    throw new DocumentPolicyError('Destinatários inválidos.');
  }
  if (!schoolCode && userUids.length === 0 && teamIds.length === 0) {
    throw new DocumentPolicyError('Acesso explícito obrigatório.');
  }
  return { schoolCode, userUids: [...userUids].sort(), teamIds: [...teamIds].sort() };
}

/** An IAM grant alone never makes a private document accessible. */
export function canUseDocument({ grant, actorUid, actorTeamIds = [], administrator = false }, descriptor, acl, action) {
  if (!ACTIONS.has(action) || !descriptor || !CLASSES.has(descriptor.classification) || !id(actorUid)) return false;
  let safeAcl;
  try { safeAcl = validateDocumentACL(acl); } catch { return false; }
  if (administrator) return true; // Only pass when verified by trusted Firebase server auth.
  if (!canAccess(grant, 'documents', action, { schoolCode: safeAcl.schoolCode, schoolBound: Boolean(safeAcl.schoolCode) })) return false;
  const isExplicit = safeAcl.userUids.includes(actorUid) || safeAcl.teamIds.some(t => actorTeamIds.includes(t));
  // Confidential files and images/records of minors cannot inherit only a broad team access.
  if (descriptor.classification !== 'internal') return safeAcl.userUids.includes(actorUid);
  return isExplicit;
}

/**
 * Construct only server-generated immutable version metadata after a private
 * storage upload has succeeded. Never overwrite a prior blob or revision.
 */
export function nextDocumentVersion(previous, { blob, storagePath, actorUid, now }) {
  if (!Buffer.isBuffer(blob) || blob.length === 0 || blob.length > 25 * 1024 * 1024 || !id(actorUid) ||
      typeof storagePath !== 'string' || !/^private\/documents\/[A-Za-z0-9_-]{3,128}\/v[1-9]\d*$/.test(storagePath) ||
      !Number.isFinite(Date.parse(now)) || !Array.isArray(previous)) throw new DocumentPolicyError('Versão inválida.');
  const expected = previous.length + 1;
  if (previous.some(v => !Number.isInteger(v.version) || v.version < 1) ||
      new Set(previous.map(v => v.version)).size !== previous.length ||
      previous.some(v => v.version >= expected) ||
      !storagePath.endsWith(`/v${expected}`)) throw new DocumentPolicyError('Sequência de versões inválida.');
  return Object.freeze({ version: expected, sha256: createHash('sha256').update(blob).digest('hex'),
    byteLength: blob.length, storagePath, createdBy: actorUid, createdAt: now,
    status: 'draft', previousVersion: expected > 1 ? expected - 1 : null });
}

export function reviewVersion(current, decision, reason, reviewerUid, now) {
  if (!current || current.status !== 'in_review' || !['approved','rejected'].includes(decision) ||
      !id(reviewerUid) || !Number.isFinite(Date.parse(now)) ||
      (decision === 'rejected' && (typeof reason !== 'string' || reason.trim().length < 5))) {
    throw new DocumentPolicyError('Revisão inválida.');
  }
  // A decision is a separate audit event; never mutate previous version records.
  return Object.freeze({ version: current.version, decision, reason: typeof reason === 'string' ? reason.trim().slice(0, 500) : '',
    reviewerUid, reviewedAt: now });
}
