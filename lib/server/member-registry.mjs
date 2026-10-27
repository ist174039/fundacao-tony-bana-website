import { appendAuditEvent } from './audit-log.mjs'
/**
 * Secure member persistence. The legacy area_socios IDs are SHA-256(email)
 * and remain in use for old documents. Newly created secure members get
 * random UUID document IDs and a separate HMAC-backed email index.
 *
 * Do not import this module into browser components.
 */
import { createHash } from "node:crypto"
import { encryptJson, decryptJson, EncryptedDataError } from "./field-encryption.mjs"
import { memberEmailBlindIndex, newMemberDocumentId } from "./membership-privacy.mjs"

const PERSONAL = ["nome", "email", "telefone", "observacoes"]
const FORMAT = "member-a256gcm-v1"

export function isMemberIndexConfigured() {
  try {
    memberEmailBlindIndex("config-check@example.invalid")
    return true
  } catch {
    return false
  }
}

export function legacyMemberDocumentId(email) {
  return createHash("sha256").update(email.trim().toLowerCase(), "utf8").digest("hex")
}

export function sealMember(record, documentPath) {
  if (!record || typeof record !== "object" || Array.isArray(record) ||
      Object.hasOwn(record, "dadosPrivados") || Object.hasOwn(record, "privacidadeFormato"))
    throw new EncryptedDataError()
  const personal = {}
  const metadata = {}
  for (const [key, value] of Object.entries(record)) {
    if (PERSONAL.includes(key)) personal[key] = value
    else metadata[key] = value
  }
  if (typeof personal.nome !== "string" || typeof personal.email !== "string")
    throw new EncryptedDataError()
  return {
    ...metadata,
    privacidadeFormato: FORMAT,
    dadosPrivados: encryptJson(personal, documentPath + "#member"),
  }
}

export function openMember(record, documentPath, { allowLegacy = true } = {}) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new EncryptedDataError()
  const plaintext = PERSONAL.some(key => Object.hasOwn(record, key))
  if (record.dadosPrivados) {
    if (record.privacidadeFormato !== FORMAT || plaintext) throw new EncryptedDataError()
    const { dadosPrivados, privacidadeFormato, ...metadata } = record
    return { ...metadata, ...decryptJson(dadosPrivados, documentPath + "#member"), privacidadeFormato }
  }
  if (plaintext && allowLegacy && !record.privacidadeFormato) return { ...record }
  throw new EncryptedDataError()
}

export function memberEmailMatches(record, documentPath, email) {
  const member = openMember(record, documentPath)
  return typeof member.email === "string" &&
    member.email.trim().toLowerCase() === email.trim().toLowerCase()
}

/**
 * Atomic member registration:
 * - prevent collision with legacy SHA256(email) IDs
 * - prevent duplicate encrypted email via HMAC index reservation
 * - create UUID member and index as one transaction
 * No financial references are modified.
 */
export async function createSecureMember(db, input, actorUid) {
  const email = input.email?.trim().toLowerCase()
  const indexId = memberEmailBlindIndex(email) // fail closed without separate index key
  const legacyId = legacyMemberDocumentId(email)
  const memberId = newMemberDocumentId()
  const memberRef = db.collection("area_socios").doc(memberId)
  const legacyRef = db.collection("area_socios").doc(legacyId)
  const indexRef = db.collection("area_member_email_index").doc(indexId)
  const now = new Date().toISOString()
  const sealed = sealMember({
    ...input, email, estado: "ativo", createdBy: actorUid, createdAt: now,
  }, memberRef.path)
  return db.runTransaction(async (tx) => {
    const [legacy, index, member] = await Promise.all([
      tx.get(legacyRef), tx.get(indexRef), tx.get(memberRef),
    ])
    if (legacy.exists || index.exists || member.exists) return { status: "duplicate" }
    tx.create(memberRef, sealed)
    appendAuditEvent(tx,db,{module:'socios',action:'create',recordPath:memberRef.path,actorUid,after:sealed,at:now})
    const indexData={socioId:memberId,createdAt:now,schema:1}
    tx.create(indexRef,indexData)
    appendAuditEvent(tx,db,{module:'member-index',action:'create',recordPath:indexRef.path,actorUid,after:indexData,at:now})
    return { status: "created", id: memberId, member: { ...input, email, estado: "ativo", createdAt: now } }
  })
}

/**
 * Resolve email in both formats, without enumerating all member records.
 * A verified, authenticated principal must be checked by the caller first.
 */
export async function findMemberByEmail(db, email) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : ""
  const indexId = memberEmailBlindIndex(normalized)
  const indexRef = db.collection("area_member_email_index").doc(indexId)
  const legacyRef = db.collection("area_socios").doc(legacyMemberDocumentId(normalized))
  const [index, old] = await Promise.all([indexRef.get(), legacyRef.get()])
  if (index.exists) {
    const id = index.get("socioId")
    if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new EncryptedDataError()
    const ref = db.collection("area_socios").doc(id)
    const member = await ref.get()
    if (!member.exists || !memberEmailMatches(member.data(), ref.path, normalized))
      throw new EncryptedDataError() // Broken index, never fallback silently
    return ref
  }
  if (old.exists && memberEmailMatches(old.data(), legacyRef.path, normalized))
    return legacyRef
  return null
}
