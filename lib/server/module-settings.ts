import 'server-only'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { isStudentIndexConfigured } from '@/lib/server/student-private.mjs'
import { MODULES, evaluateModuleStates, isKnownModule, moduleDefinition } from '@/lib/server/module-registry.mjs'

export type ModuleId = 'schools' | 'students' | 'material' | 'deliveries' | 'documents'
export type ModuleStatus = {
  id: ModuleId; label: string; description: string; desiredEnabled: boolean;
  enabled: boolean; ready: boolean; blockers: string[]; revision: number;
  updatedAt: string | null; updatedBy: string | null;
}

type StoredModule = { enabled?: boolean; revision?: number; updatedAt?: string; updatedBy?: string }
const collectionName = 'area_module_settings'

function capabilities() {
  const output: Record<string, string[]> = {}
  for (const item of MODULES) {
    const blockers: string[] = []
    if (process.env[item.envFlag] !== 'true') blockers.push('A ativação técnica ainda não foi autorizada no ambiente do servidor.')
    if (!isFirebaseAdminConfigured()) blockers.push('Ligação administrativa ao Firebase não configurada.')
    if (item.requiresEncryption && !isFieldEncryptionConfigured()) blockers.push('Chaves de cifragem não configuradas.')
    if (item.id === 'students' && !isStudentIndexConfigured()) blockers.push('Índice privado dos alunos não configurado.')
    if (item.id === 'documents' && (!process.env.FTB_DOCUMENTS_BUCKET || !/^[a-z0-9][a-z0-9.-]{5,200}$/.test(process.env.FTB_DOCUMENTS_BUCKET))) {
      blockers.push('Armazenamento privado de documentos não configurado.')
    }
    output[item.id] = blockers
  }
  return output
}

/** Do not cache: an admin disabling a module must block subsequent API calls. */
export async function listModuleStatuses(): Promise<ModuleStatus[]> {
  if (!isFirebaseAdminConfigured()) return evaluateModuleStates({}, capabilities()) as ModuleStatus[]
  const snapshot = await getFirebaseAdminFirestore().collection(collectionName).limit(30).get()
  const records: Record<string, StoredModule> = {}
  for (const doc of snapshot.docs) if (isKnownModule(doc.id)) records[doc.id] = doc.data() as StoredModule
  return evaluateModuleStates(records, capabilities()) as ModuleStatus[]
}

export async function isOperationalModuleEnabled(id: ModuleId): Promise<boolean> {
  if (!moduleDefinition(id) || !isFirebaseAdminConfigured()) return false
  // Fail closed if Firestore is unavailable or configuration is corrupt.
  try {
    const db = getFirebaseAdminFirestore()
    const record = await db.collection(collectionName).doc(id).get()
    if (!record.exists || record.get('enabled') !== true) return false
    if (capabilities()[id].length > 0) return false
    for (const parent of moduleDefinition(id).dependencies) {
      const parentDoc = await db.collection(collectionName).doc(parent).get()
      if (!parentDoc.exists || parentDoc.get('enabled') !== true || capabilities()[parent].length > 0) return false
    }
    return true
  } catch (error) {
    console.error('[module-settings] Unable to check module availability', { id })
    return false
  }
}

export async function updateOperationalModule(input: { moduleId: ModuleId; enabled: boolean; expectedRevision: number }, actorUid: string) {
  if (!isFirebaseAdminConfigured() || !actorUid) throw new Error('Serviço administrativo não configurado.')
  const db = getFirebaseAdminFirestore()
  const ref = db.collection(collectionName).doc(input.moduleId)
  const audit = db.collection('area_module_settings_audit').doc()
  // Operational preconditions are independently enforced on every read and write.
  if (input.enabled) {
    const status = (await listModuleStatuses()).find(s => s.id === input.moduleId)
    if (!status?.ready) return { result: 'blocked' as const, blockers: status?.blockers || ['Módulo não disponível.'] }
  }
  return db.runTransaction(async tx => {
    const current = await tx.get(ref)
    const revision = current.exists ? current.get('revision') : 0
    if (!Number.isSafeInteger(revision) || revision !== input.expectedRevision) return { result: 'conflict' as const }
    const currentEnabled = current.exists && current.get('enabled') === true
    // No operation, no spurious audit events or revision changes.
    if (currentEnabled === input.enabled) return { result: 'unchanged' as const, revision }
    const nextRevision = revision + 1
    const now = new Date().toISOString()
    tx.set(ref, { enabled: input.enabled, revision: nextRevision, updatedAt: now, updatedBy: actorUid })
    tx.create(audit, { moduleId: input.moduleId, previousEnabled: currentEnabled, enabled: input.enabled,
      previousRevision: revision, revision: nextRevision, actorUid, at: now })
    return { result: 'updated' as const, revision: nextRevision }
  })
}
