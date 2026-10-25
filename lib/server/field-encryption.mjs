/**
 * Application-layer authenticated field encryption (AES-256-GCM).
 * This module is server-only by convention; never import it into a client component.
 *
 * Server secrets:
 * FTB_DATA_ENCRYPTION_KEYS_JSON={"key-2026":"<32-byte base64 key>"}
 * FTB_DATA_ENCRYPTION_ACTIVE_KID=key-2026
 *
 * Keep old keys available during rotation until all records are re-encrypted.
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

export class EncryptionConfigurationError extends Error {
  constructor() {
    super("Cifragem de dados pessoais não configurada no servidor.")
    this.name = "EncryptionConfigurationError"
  }
}
export class EncryptedDataError extends Error {
  constructor() {
    super("Os dados protegidos não puderam ser autenticados.")
    this.name = "EncryptedDataError"
  }
}
const ALGORITHM = "aes-256-gcm"
const FORMAT = "A256GCM-v1"
const KEY_ID = /^[a-zA-Z0-9_-]{1,48}$/
const BASE64 = /^[a-zA-Z0-9+/]+={0,2}$/

function getKeys() {
  const raw = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  const activeKid = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  if (!raw || !activeKid || !KEY_ID.test(activeKid)) throw new EncryptionConfigurationError()
  let dict
  try { dict = JSON.parse(raw) } catch { throw new EncryptionConfigurationError() }
  if (!dict || typeof dict !== "object" || Array.isArray(dict)) throw new EncryptionConfigurationError()
  const keys = new Map()
  for (const [kid, encoded] of Object.entries(dict)) {
    if (!KEY_ID.test(kid) || typeof encoded !== "string" || !BASE64.test(encoded))
      throw new EncryptionConfigurationError()
    const key = Buffer.from(encoded, "base64")
    if (key.length !== 32 || key.toString("base64") !== encoded) throw new EncryptionConfigurationError()
    keys.set(kid, key)
  }
  if (!keys.has(activeKid)) throw new EncryptionConfigurationError()
  return { keys, activeKid }
}

export function isFieldEncryptionConfigured() {
  try { getKeys(); return true } catch { return false }
}

/**
 * aad must be bound to the document path and semantic field name.
 * Example: "area_schools/FTB-001#contacts/123#personal".
 */
function assertContext(aad) {
  if (typeof aad !== "string" || aad.length < 5 || aad.length > 500)
    throw new EncryptedDataError()
}

export function encryptJson(value, aad) {
  assertContext(aad)
  const { keys, activeKid } = getKeys()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, keys.get(activeKid), iv, { authTagLength: 16 })
  cipher.setAAD(Buffer.from(aad, "utf8"))
  const plain = Buffer.from(JSON.stringify(value), "utf8")
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()])
  return {
    alg: FORMAT,
    kid: activeKid,
    iv: iv.toString("base64"),
    data: encrypted.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  }
}

function decodePart(value, length) {
  if (typeof value !== "string" || !BASE64.test(value)) throw new EncryptedDataError()
  const buffer = Buffer.from(value, "base64")
  if (buffer.toString("base64") !== value || (length && buffer.length !== length))
    throw new EncryptedDataError()
  return buffer
}

export function decryptJson(envelope, aad) {
  assertContext(aad)
  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope) ||
      envelope.alg !== FORMAT || typeof envelope.kid !== "string" ||
      !KEY_ID.test(envelope.kid)) throw new EncryptedDataError()
  const { keys } = getKeys()
  const key = keys.get(envelope.kid)
  if (!key) throw new EncryptionConfigurationError()
  try {
    const decipher = createDecipheriv(ALGORITHM, key, decodePart(envelope.iv, 12), { authTagLength: 16 })
    decipher.setAAD(Buffer.from(aad, "utf8"))
    decipher.setAuthTag(decodePart(envelope.tag, 16))
    return JSON.parse(Buffer.concat([
      decipher.update(decodePart(envelope.data)),
      decipher.final(),
    ]).toString("utf8"))
  } catch {
    throw new EncryptedDataError()
  }
}
