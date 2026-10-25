/**
 * Application-encrypted personal notes for quotas and monetary donations.
 * Financial amounts, currency, type, dates, obligation/member reference and
 * payment method remain queryable for reconciliations.
 */
import { encryptJson, decryptJson, EncryptedDataError } from "./field-encryption.mjs"
const FIELDS = ["doador", "socioNome", "notas"]
const KINDS = new Set(["transaction", "quota"])
const VERSION = "A256GCM-finance-v1"

function context(path, kind) {
  if (!KINDS.has(kind) || typeof path !== "string") throw new EncryptedDataError()
  return path + "#finance-" + kind
}

export function sealFinancialRecord(data, path, kind) {
  const aad = context(path, kind)
  if (!data || typeof data !== "object" || Array.isArray(data) ||
    Object.hasOwn(data, "dadosPrivados") || Object.hasOwn(data, "privacidadeFormato"))
    throw new EncryptedDataError()
  const privateData = {}
  const publicData = {}
  for (const [key, value] of Object.entries(data)) {
    if (FIELDS.includes(key)) privateData[key] = value
    else publicData[key] = value
  }
  return {
    ...publicData,
    privacidadeFormato: VERSION,
    dadosPrivados: encryptJson(privateData, aad),
  }
}

export function openFinancialRecord(raw, path, kind, { allowLegacy = false } = {}) {
  const aad = context(path, kind)
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new EncryptedDataError()
  const mixed = FIELDS.some(key => Object.hasOwn(raw, key))
  if (raw.dadosPrivados) {
    if (mixed || raw.privacidadeFormato !== VERSION) throw new EncryptedDataError()
    const { dadosPrivados, privacidadeFormato, ...metadata } = raw
    return { ...metadata, ...decryptJson(dadosPrivados, aad), privacidadeFormato }
  }
  if (!raw.privacidadeFormato && allowLegacy) return { ...raw }
  throw new EncryptedDataError()
}
