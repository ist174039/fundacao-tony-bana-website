/**
 * Operational module switches. A remote switch is never sufficient on its own:
 * a deployment safety gate, required secrets and dependencies remain mandatory.
 * Core identity, membership and financial records are intentionally NOT switchable.
 */
export class ModuleSettingsError extends Error {
  constructor(message) { super(message); this.name = 'ModuleSettingsError' }
}

export const MODULES = Object.freeze([
  Object.freeze({ id: 'schools', label: 'Escolas', description: 'Cadastro de escolas e contactos institucionais.', envFlag: 'FTB_SCHOOLS_ENABLED', requiresEncryption: true, dependencies: [] }),
  Object.freeze({ id: 'students', label: 'Alunos', description: 'Registos escolares com dados pessoais protegidos.', envFlag: 'FTB_STUDENTS_ENABLED', requiresEncryption: true, dependencies: ['schools'] }),
  Object.freeze({ id: 'material', label: 'Doações materiais', description: 'Receções de bens, validação e entrada em stock.', envFlag: 'FTB_MATERIAL_DONATIONS_ENABLED', requiresEncryption: true, dependencies: [] }),
  Object.freeze({ id: 'deliveries', label: 'Entregas de doações', description: 'Guias e confirmação de entregas com movimentos de saída de stock.', envFlag: 'FTB_MATERIAL_DELIVERIES_ENABLED', requiresEncryption: true, dependencies: ['material'] }),
  Object.freeze({ id: 'documents', label: 'Documentos e equipas', description: 'Bibliotecas, pastas, partilha por equipa e versões privadas.', envFlag: 'FTB_DOCUMENTS_ENABLED', requiresEncryption: true, dependencies: [] }),
])

const validIds = new Set(MODULES.map(m => m.id))
export function isKnownModule(id) { return typeof id === 'string' && validIds.has(id) }
export function moduleDefinition(id) { return MODULES.find(m => m.id === id) ?? null }

export function parseModuleChange(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      Object.keys(value).some(key => !['moduleId', 'enabled', 'expectedRevision'].includes(key)) ||
      !isKnownModule(value.moduleId) || typeof value.enabled !== 'boolean' ||
      !Number.isSafeInteger(value.expectedRevision) || value.expectedRevision < 0) {
    throw new ModuleSettingsError('Pedido de configuração inválido.')
  }
  return { moduleId: value.moduleId, enabled: value.enabled, expectedRevision: value.expectedRevision }
}

/** Pure readiness: no secrets or secret values leave the server. */
export function evaluateModuleStates(records = {}, capabilities = {}) {
  const states = {}
  function resolve(id) {
    if (states[id]) return states[id]
    const definition = moduleDefinition(id)
    if (!definition) throw new ModuleSettingsError('Módulo desconhecido.')
    const raw = records[id] || {}
    const desiredEnabled = raw.enabled === true
    const revision = Number.isSafeInteger(raw.revision) && raw.revision >= 0 ? raw.revision : 0
    const blockers = [...(capabilities[id] || [])]
    for (const dependency of definition.dependencies) {
      if (!resolve(dependency).enabled) blockers.push(`O módulo «${moduleDefinition(dependency).label}» tem de estar ativo.`)
    }
    const ready = blockers.length === 0
    const state = {
      id: definition.id, label: definition.label, description: definition.description,
      desiredEnabled, enabled: desiredEnabled && ready, ready,
      blockers, revision, updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
      updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : null,
    }
    states[id] = state
    return state
  }
  return MODULES.map(m => resolve(m.id))
}
