import { appendAuditEvent } from './audit-log.mjs'
/**
 * Secure, field-allowlisted member updates.
 * Prevents a PATCH from introducing cleartext into an already-encrypted
 * member or accidentally downgrading it after a feature-flag rollback.
 */
import { openMember, sealMember } from "./member-registry.mjs"

export class MemberUpdateError extends Error {
  constructor(code) { super(code); this.name = "MemberUpdateError"; this.code = code }
}

export async function updateMemberProfile(db, FieldValue, id, changes, actorUid, { secureWrites = false } = {}) {
  if (!/^[a-zA-Z0-9_-]{12,90}$/.test(id)) throw new MemberUpdateError("INVALID_ID")
  const allowed = ["nome", "telefone", "numeroSocio", "observacoes", "estado"]
  if (!changes || Object.keys(changes).some(k => !allowed.includes(k)))
    throw new MemberUpdateError("INVALID_FIELDS")
  if (typeof changes.nome !== "string" || changes.nome.trim().length < 2)
    throw new MemberUpdateError("INVALID_NAME")

  const ref = db.collection("area_socios").doc(id)
  return db.runTransaction(async tx => {
    const current = await tx.get(ref)
    if (!current.exists) return "not-found"
    const raw = current.data()
    // Invalid or mixed legacy/encrypted documents fail closed.
    const opened = openMember(raw, ref.path)
    const updatedAt = new Date().toISOString()
    const safeChanges = {
      nome: changes.nome,
      telefone: typeof changes.telefone === "string" ? changes.telefone : "",
      numeroSocio: typeof changes.numeroSocio === "string" ? changes.numeroSocio : "",
      observacoes: typeof changes.observacoes === "string" ? changes.observacoes : "",
      estado: changes.estado === "inativo" ? "inativo" : "ativo",
      updatedBy: actorUid,
      updatedAt,
    }
    // Once ciphertext exists, the record must never become plaintext.
    const encrypted = Boolean(raw.dadosPrivados)
    if (encrypted || secureWrites) {
      const { privacidadeFormato: _format, ...existing } = opened
      const sealed = sealMember({ ...existing, ...safeChanges }, ref.path)
      tx.update(ref, {
        ...sealed,
        nome: FieldValue.delete(),
        email: FieldValue.delete(),
        telefone: FieldValue.delete(),
        observacoes: FieldValue.delete(),
      })
    } else {
      tx.update(ref, safeChanges)
    }
    appendAuditEvent(tx,db,{module:'socios',action:'update',recordPath:ref.path,actorUid,before:raw,after:encrypted||secureWrites?{...raw,...safeChanges,privacidadeFormato:'member-a256gcm-v1'}:{...raw,...safeChanges},at:updatedAt})
    return encrypted || secureWrites ? "updated-encrypted" : "updated-legacy"
  })
}
