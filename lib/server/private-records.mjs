/**
 * Firestore serializers deliberately omit personal fields from plaintext.
 * Public metadata stays queryable while personal data is encrypted.
 * AAD binds ciphertext to the exact Firestore document + field.
 */
import { encryptJson, decryptJson, EncryptedDataError } from "./field-encryption.mjs"

const schoolPrivate = ["endereco", "telefone", "email"]
const protectedKeys = new Set([...schoolPrivate, "dadosPrivados"])
const receiverPrivate = ["doador", "origem", "finalidade", "referenciaDocumento", "observacoes", "itens"]

export function sealSchool(input, docPath) {
  const publicData = {}
  const privateData = {}
  for (const [key, value] of Object.entries(input)) {
    if (schoolPrivate.includes(key)) privateData[key] = value
    else if (key !== "dadosPrivados") publicData[key] = value
  }
  return { ...publicData, dadosPrivados: encryptJson(privateData, docPath + "#school") }
}

export function openSchool(doc, docPath) {
  const { dadosPrivados, endereco, telefone, email, ...publicData } = doc
  if (dadosPrivados) return { ...publicData, ...decryptJson(dadosPrivados, docPath + "#school") }
  // Legacy plaintext cannot be exposed: records need a controlled migration.
  if (endereco || telefone || email) return { ...publicData, necessitaMigracaoPrivacidade: true }
  return publicData
}

export function patchSchool(input, current, docPath) {
  if (!current?.dadosPrivados) throw new EncryptedDataError()
  const existing = openSchool(current, docPath)
  return sealSchool({
    ...existing, ...input,
  }, docPath)
}

export function sealContact(input, docPath) {
  return { dadosPrivados: encryptJson(input, docPath + "#contact") }
}

export function openContact(doc, docPath) {
  if (!doc?.dadosPrivados) throw new EncryptedDataError()
  return decryptJson(doc.dadosPrivados, docPath + "#contact")
}

export function sealMaterialReception(input, docPath) {
  const data = { ...input }
  const secret = {}
  for (const key of receiverPrivate) {
    if (Object.hasOwn(data, key)) {
      secret[key] = data[key]
      delete data[key]
    }
  }
  return { ...data, dadosPrivados: encryptJson(secret, docPath + "#reception") }
}

export function openMaterialReception(doc, docPath) {
  if (!doc?.dadosPrivados) throw new EncryptedDataError()
  const { dadosPrivados, ...publicData } = doc
  return { ...publicData, ...decryptJson(dadosPrivados, docPath + "#reception") }
}

export function sealStockItem(item, docPath) {
  const { quantidade, unidade, ...privateData } = item
  return {
    quantidadeRecebida: quantidade,
    quantidadeDisponivel: quantidade,
    unidade,
    dadosPrivados: encryptJson(privateData, docPath + "#stock"),
  }
}
