/**
 * Central policy for human-operated modules (FTB-IAM-001, FTB-DOC-006).
 * This file is intentionally independent from Firebase to permit deterministic
 * testing. A custom admin role is NEVER delegated here: admin identity must be
 * checked independently against trusted Firebase claims/allowlists.
 *
 * Deny by default. Grant definitions are declarative until each API explicitly
 * calls the server-side guard. The UI alone does not enforce authorisation.
 */

export class AccessGrantError extends Error {
  constructor(message) { super(message); this.name = 'AccessGrantError' }
}

export const ACCESS_MODULES = Object.freeze([
  'schools', 'students', 'donations', 'stock', 'finance', 'documents', 'visits', 'reports', 'users',
]);
export const ACCESS_ACTIONS = Object.freeze(['read', 'create', 'update', 'approve', 'delete', 'share']);
export const ACCESS_PROFILES = Object.freeze({
  school_coordinator: Object.freeze({
    schools: ['read', 'update'], students: ['read', 'create', 'update'],
    donations: ['read'], stock: ['read'], documents: ['read', 'create'], visits: ['read', 'create', 'update'],
  }),
  education_worker: Object.freeze({
    schools: ['read'], students: ['read', 'update'], documents: ['read', 'create'], visits: ['read', 'create'],
  }),
  logistics: Object.freeze({
    schools: ['read'], donations: ['read', 'create', 'update'], stock: ['read', 'create', 'update'],
    documents: ['read', 'create'],
  }),
  treasurer: Object.freeze({ finance: ['read', 'create', 'update'], donations: ['read'], documents: ['read', 'create'] }),
  document_reviewer: Object.freeze({ documents: ['read', 'approve'], visits: ['read'], reports: ['read'] }),
  auditor: Object.freeze({
    schools: ['read'], donations: ['read'], stock: ['read'], finance: ['read'],
    documents: ['read'], visits: ['read'], reports: ['read'],
  }),
  // Existing associates should continue using their own member-scoped APIs.
  associate: Object.freeze({}),
});

const SCHOOL_CODE = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const MAX_SCHOOLS = 100;
const MAX_PROFILES = 8;
const MAX_PERMISSIONS = 100;
const moduleSet = new Set(ACCESS_MODULES);
const actionSet = new Set(ACCESS_ACTIONS);
const profileSet = new Set(Object.keys(ACCESS_PROFILES));

/** Strict input schema: reject unknown properties rather than silently bypassing validation. */
export function validateAccessGrant(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new AccessGrantError('Permissões inválidas.');
  const allowed = new Set(['profiles', 'schoolCodes', 'overrides']);
  if (Object.keys(raw).some(key => !allowed.has(key))) throw new AccessGrantError('Campo de permissões não autorizado.');
  if (!Array.isArray(raw.profiles) || raw.profiles.length > MAX_PROFILES ||
      raw.profiles.some(p => typeof p !== 'string' || !profileSet.has(p))) {
    throw new AccessGrantError('Perfis inválidos.');
  }
  if (!Array.isArray(raw.schoolCodes) || raw.schoolCodes.length > MAX_SCHOOLS ||
      raw.schoolCodes.some(code => typeof code !== 'string' || !SCHOOL_CODE.test(code))) {
    throw new AccessGrantError('Âmbito de escolas inválido.');
  }
  const overrides = raw.overrides ?? [];
  if (!Array.isArray(overrides) || overrides.length > MAX_PERMISSIONS) throw new AccessGrantError('Exceções inválidas.');
  const keys = new Set();
  const sanitizedOverrides = overrides.map(v => {
    if (!v || typeof v !== 'object' || Array.isArray(v) ||
        Object.keys(v).some(k => !['module', 'action', 'allow'].includes(k)) ||
        !moduleSet.has(v.module) || !actionSet.has(v.action) || typeof v.allow !== 'boolean') {
      throw new AccessGrantError('Exceção de permissão inválida.');
    }
    // Never permit remote assignment of user/role/permission administration.
    if (v.module === 'users') throw new AccessGrantError('A gestão de utilizadores é reservada a administradores do sistema.');
    const key = `${v.module}:${v.action}`;
    if (keys.has(key)) throw new AccessGrantError('Exceção duplicada.');
    keys.add(key);
    return { module: v.module, action: v.action, allow: v.allow };
  });
  // No duplicate profiles or school IDs, no case-folded/ambiguous values.
  if (new Set(raw.profiles).size !== raw.profiles.length || new Set(raw.schoolCodes).size !== raw.schoolCodes.length) {
    throw new AccessGrantError('Perfis ou escolas duplicados.');
  }
  return {
    profiles: [...raw.profiles].sort(),
    schoolCodes: [...raw.schoolCodes].sort(),
    overrides: sanitizedOverrides.sort((a,b) => `${a.module}:${a.action}`.localeCompare(`${b.module}:${b.action}`)),
  };
}

/**
 * Evaluate only known modules and actions. The scope is mandatory for records
 * classified as school-bound; absence is not interpreted as global scope.
 */
export function canAccess(grant, module, action, { schoolCode = null, schoolBound = false } = {}) {
  if (!moduleSet.has(module) || !actionSet.has(action) || module === 'users') return false;
  let safe;
  try { safe = validateAccessGrant(grant); } catch { return false; }
  if (schoolBound && (!schoolCode || !safe.schoolCodes.includes(schoolCode))) return false;
  const explicit = safe.overrides.find(x => x.module === module && x.action === action);
  if (explicit) return explicit.allow;
  return safe.profiles.some(profile => (ACCESS_PROFILES[profile][module] || []).includes(action));
}

export const EMPTY_ACCESS_GRANT = Object.freeze({ profiles: [], schoolCodes: [], overrides: [] });
