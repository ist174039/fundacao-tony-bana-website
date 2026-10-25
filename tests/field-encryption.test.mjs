import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import {
  encryptJson, decryptJson, isFieldEncryptionConfigured,
  EncryptionConfigurationError, EncryptedDataError,
} from "../lib/server/field-encryption.mjs"
import {
  sealSchool, openSchool, patchSchool, sealContact, openContact,
  sealMaterialReception, openMaterialReception, sealStockItem,
} from "../lib/server/private-records.mjs"

function withKeys(action) {
  const a = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  const v = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  try {
    const keys = { k1: randomBytes(32).toString("base64"), k2: randomBytes(32).toString("base64") }
    process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = JSON.stringify(keys)
    process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "k1"
    return action()
  } finally {
    if (a === undefined) delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = a
    if (v === undefined) delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = v
  }
}
test("AES-GCM encrypts and authenticates field payload; random nonces", () => withKeys(() => {
  const value = { nome: "Responsável Exemplo", email: "demo@example.org" }
  const path = "area_schools/FTB-001/contactos/c1#contact"
  const a = encryptJson(value, path)
  const b = encryptJson(value, path)
  assert.equal(a.alg, "A256GCM-v1")
  assert.notEqual(a.iv, b.iv)
  assert.notEqual(a.data, b.data)
  assert.deepEqual(decryptJson(a, path), value)
  assert.equal(JSON.stringify(a).includes("Responsável Exemplo"), false)
  assert.throws(() => decryptJson(a, path + "-changed"), EncryptedDataError)
  assert.throws(() => decryptJson({ ...a, tag: Buffer.alloc(16).toString("base64") }, path), EncryptedDataError)
  assert.throws(() => decryptJson({ ...a, data: Buffer.from("altered").toString("base64") }, path), EncryptedDataError)
}))
test("keys rotate using key ID while preserving old records", () => withKeys(() => {
  const sealed = encryptJson({ email: "demo@example.org" }, "area_schools/SCHOOL1#school")
  process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "k2"
  const fresh = encryptJson({ email: "other@example.org" }, "area_schools/SCHOOL1#school")
  assert.equal(sealed.kid, "k1")
  assert.equal(fresh.kid, "k2")
  assert.equal(decryptJson(sealed, "area_schools/SCHOOL1#school").email, "demo@example.org")
  assert.equal(decryptJson(fresh, "area_schools/SCHOOL1#school").email, "other@example.org")
}))
test("misconfigured or absent secrets fail closed", () => {
  const a = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  const v = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  try {
    delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    assert.equal(isFieldEncryptionConfigured(), false)
    assert.throws(() => encryptJson({ nome: "x" }, "area_schools/FTB-001#school"), EncryptionConfigurationError)
    process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "bad"
    process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = '{"bad":"not-base64"}'
    assert.equal(isFieldEncryptionConfigured(), false)
  } finally {
    if (a === undefined) delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = a
    if (v === undefined) delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = v
  }
})
test("school and contacts store no personal plaintext", () => withKeys(() => {
  const schoolPath = "area_schools/FTB-001"
  const record = sealSchool({
    codigo: "FTB-001", nome: "Escola do Bairro", pais: "PT",
    email: "direcao@example.org", telefone: "+351000000000", endereco: "Rua de Teste",
  }, schoolPath)
  const raw = JSON.stringify(record)
  assert.ok(!raw.includes("direcao@example.org") && !raw.includes("Rua de Teste"))
  assert.equal(openSchool(record, schoolPath).telefone, "+351000000000")
  const patch = patchSchool({ telefone: "+351111111111", nome: "Escola Nova" }, record, schoolPath)
  assert.equal(openSchool(patch, schoolPath).email, "direcao@example.org")
  assert.equal(openSchool(patch, schoolPath).telefone, "+351111111111")
  assert.ok(!JSON.stringify(patch).includes("+351111111111"))
  const p = schoolPath + "/contactos/c1"
  const contact = sealContact({ nome: "Professor", cargo: "Direção", email: "prof@example.org" }, p)
  assert.ok(!JSON.stringify(contact).includes("prof@example.org"))
  assert.equal(openContact(contact, p).nome, "Professor")
  assert.throws(() => openContact(contact, schoolPath + "/contactos/c2"), EncryptedDataError)
  assert.equal(openSchool({ nome: "Old", email: "clear@example.org" }, schoolPath).necessitaMigracaoPrivacidade, true)
}))
test("material donor details, free-text and stock descriptions are encrypted", () => withKeys(() => {
  const path = "area_material_receptions/a123"
  const sealed = sealMaterialReception({
    numero: "MAT-20261025-AAA",
    estado: "pendente",
    doador: { nome: "Doador Exemplo", telefone: "123456" },
    observacoes: "Entregar a aluno X",
    itens: [{ categoria: "Material", descricao: "Caderno do aluno Y", quantidade: 2, unidade: "un", estado: "novo" }],
    referenciaDocumento: "Guia privada X",
  }, path)
  for (const secret of ["Doador Exemplo", "Entregar a aluno X", "Caderno do aluno Y", "Guia privada X"]) {
    assert.ok(!JSON.stringify(sealed).includes(secret))
  }
  assert.equal(openMaterialReception(sealed, path).itens[0].descricao, "Caderno do aluno Y")
  const stock = sealStockItem({ categoria: "Material", descricao: "Caderno do aluno Y", estado: "novo", quantidade: 2, unidade: "un" }, "area_material_stock_lots/a123-0")
  assert.ok(!JSON.stringify(stock).includes("Caderno do aluno Y"))
  assert.equal(stock.quantidadeDisponivel, 2)
}))
