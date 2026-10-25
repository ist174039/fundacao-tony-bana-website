/**
 * Protected membership enquiry/adhesion records.
 * Existing plaintext documents are readable only within the authorized
 * backoffice. New encrypted documents contain no personal fields in cleartext.
 */
import { createHmac, randomUUID } from "node:crypto"
import { encryptJson, decryptJson, EncryptionConfigurationError, EncryptedDataError } from "./field-encryption.mjs"

const FIELDS = ["nome", "email", "telefone", "mensagem"]
const LEGACY_AUDIT = "legacy-plaintext"
const FORMAT = "member-intention-aes-gcm-v1"

function inspectRecord(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new EncryptedDataError()
  const privatePresent = FIELDS.some(key => Object.hasOwn(record, key))
  if (record.dadosPrivados && privatePresent) throw new EncryptedDataError()
  return privatePresent
}

export function sealMembershipIntention(record, path) {
  if (!record || typeof record !== "object" || Array.isArray(record)) throw new EncryptedDataError()
  const privateFields = {}
  const metadata = {}
  for (const [key, value] of Object.entries(record)) {
    if (key === "dadosPrivados" || key === "privacidadeFormato") throw new EncryptedDataError()
    if (FIELDS.includes(key)) privateFields[key] = value
    else metadata[key] = value
  }
  if (typeof privateFields.nome !== "string" || typeof privateFields.email !== "string")
    throw new EncryptedDataError()
  return {
    ...metadata,
    privacidadeFormato: FORMAT,
    dadosPrivados: encryptJson(privateFields, path + "#membership-intention"),
  }
}

export function openMembershipIntention(record, path, { allowLegacy = false } = {}) {
  const legacy = inspectRecord(record)
  if (record.dadosPrivados) {
    if (record.privacidadeFormato !== FORMAT) throw new EncryptedDataError()
    const { dadosPrivados, privacidadeFormato, ...metadata } = record
    const data = decryptJson(dadosPrivados, path + "#membership-intention")
    return { ...metadata, ...data, privacidadeFormato }
  }
  if (legacy && allowLegacy && !record.privacidadeFormato) {
    return { ...record, privacidadeFormato: LEGACY_AUDIT }
  }
  // Fail-closed: corrupt, ambiguously formatted or legacy without explicit opt-in.
  throw new EncryptedDataError()
}

/**
 * Emulator migration planner: no mutation and no personal values in the output.
 */
export function classifyMembershipIntention(record) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return "invalid"
  try {
    const legacy = inspectRecord(record)
    if (legacy && !record.dadosPrivados && !record.privacidadeFormato) return "legacy"
    if (!legacy && record.dadosPrivados && record.privacidadeFormato === FORMAT) return "encrypted"
    return "invalid"
  } catch {
    return "invalid"
  }
}

/**
 * The future member-email lookup key is secret-keyed, unlike SHA-256(email).
 * This does NOT yet change production member document IDs or financial references.
 */
function blindIndexKey() {
  const encoded = process.env.FTB_MEMBER_INDEX_KEY_B64
  if (typeof encoded !== "string" || !/^[a-zA-Z0-9+/]+={0,2}$/.test(encoded))
    throw new EncryptionConfigurationError()
  const key = Buffer.from(encoded, "base64")
  if (key.length !== 32 || key.toString("base64") !== encoded)
    throw new EncryptionConfigurationError()
  return key
}

export function memberEmailBlindIndex(email) {
  if (typeof email !== "string") throw new EncryptedDataError()
  const normalized = email.trim().toLowerCase()
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized))
    throw new EncryptedDataError()
  return createHmac("sha256", blindIndexKey())
    .update("ftb.member-email.v1\0" + normalized, "utf8")
    .digest("hex")
}

export function newMemberDocumentId() {
  return randomUUID()
}
