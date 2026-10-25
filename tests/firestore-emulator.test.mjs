/**
 * True Firebase Emulator integration tests.
 * Refuse to execute unless the locally hosted emulator and demo project are set.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from "firebase-admin/app"
import { getFirestore as getAdminFirestore, FieldValue } from "firebase-admin/firestore"
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from "firebase/app"
import { getFirestore as getClientFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, terminate } from "firebase/firestore"
import { encryptJson } from "../lib/server/field-encryption.mjs"
import { sealMaterialReception, openMaterialReception, sealSchool, openSchool, sealContact, openContact } from "../lib/server/private-records.mjs"
import { confirmMaterialReceipt } from "../lib/server/material-stock.mjs"
import { sealMembershipIntention, openMembershipIntention, classifyMembershipIntention } from "../lib/server/membership-privacy.mjs"
import { migrateMembershipIntentionInEmulator } from "../lib/server/membership-intention-emulator.mjs"
import { sealFinancialRecord, openFinancialRecord } from "../lib/server/financial-privacy.mjs"

const host = process.env.FIRESTORE_EMULATOR_HOST
const projectId = process.env.GCLOUD_PROJECT
if (!["127.0.0.1:8080", "localhost:8080"].includes(host) || !/^demo-[a-z0-9-]+$/.test(projectId || "")) {
  throw new Error("Integration tests must use a local Firestore Emulator and demo-* project")
}
// Keys exist only in this process, for fake documents, and are not printed.
process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = JSON.stringify({ integration: randomBytes(32).toString("base64") })
process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "integration"

const unique = randomBytes(8).toString("hex")
const adminApp = initializeAdminApp({ projectId }, "ftb-emulator-admin-" + unique)
const db = getAdminFirestore(adminApp)

const browserApp = initializeClientApp({
  projectId, appId: "1:123456789:web:fake-test-id", apiKey: "fake-test-only-key",
}, "ftb-emulator-browser-" + unique)
const browserDb = getClientFirestore(browserApp)
connectFirestoreEmulator(browserDb, "127.0.0.1", 8080)

test("an unauthenticated Firebase client cannot read or write private records", async () => {
  const target = doc(browserDb, "area_material_receptions", "rececao" + unique)
  await assert.rejects(getDoc(target), (error) => error?.code === "permission-denied")
  await assert.rejects(setDoc(target, { estado: "confirmada" }), (error) => error?.code === "permission-denied")
})

test("school and school-contact fields remain private in Firestore documents", async () => {
  const school = db.collection("area_schools").doc("ESC" + unique)
  await school.create({
    ...sealSchool({
      codigo: school.id, nome: "Escola de Teste", pais: "PT",
      email: "school@example.invalid", telefone: "+0000", endereco: "Rua Sintética",
    }, school.path),
    estado: "ativa",
  })
  const raw = (await school.get()).data()
  for (const secret of ["school@example.invalid", "+0000", "Rua Sintética"]) {
    assert.equal(JSON.stringify(raw).includes(secret), false)
  }
  assert.equal(openSchool(raw, school.path).email, "school@example.invalid")
  const contact = school.collection("contactos").doc("person" + unique)
  await contact.create({
    ...sealContact({ nome: "Responsável Sintético", cargo: "Direção", email: "teacher@example.invalid" }, contact.path),
  })
  const stored = (await contact.get()).data()
  assert.equal(JSON.stringify(stored).includes("Responsável Sintético"), false)
  assert.equal(openContact(stored, contact.path).nome, "Responsável Sintético")
  assert.throws(() => openContact(stored, contact.path + "-other"))
})

test("physical material reception encrypts PII and creates stock exactly once", async () => {
  const id = "rececao" + unique
  const ref = db.collection("area_material_receptions").doc(id)
  const input = {
    doador: { nome: "Doador Fictício", email: "teste@example.invalid", telefone: "0000", anonimo: false },
    observacoes: "Entregar material a pessoa fictícia",
    referenciaDocumento: "GUIA-SINTETICA",
    itens: [
      { categoria: "Escolar", descricao: "Caderno genérico", quantidade: 10, unidade: "un", estado: "novo" },
      { categoria: "Alimentação", descricao: "Arroz embalado", quantidade: 4.5, unidade: "kg", estado: "novo" },
    ],
    estado: "pendente",
  }
  await ref.create({
    ...sealMaterialReception(input, ref.path),
    criadoEm: new Date().toISOString(),
  })

  const rawBefore = (await ref.get()).data()
  const visibleJson = JSON.stringify(rawBefore)
  for (const secret of ["Doador Fictício", "teste@example.invalid", "GUIA-SINTETICA", "Caderno genérico"]) {
    assert.equal(visibleJson.includes(secret), false, "Plaintext not allowed in stored document")
  }
  assert.equal(openMaterialReception(rawBefore, ref.path).itens.length, 2)
  assert.equal((await db.collection("area_material_stock_movements").where("rececaoId", "==", id).get()).size, 0)

  // Two operators race to confirm the same physical reception.
  const outcomes = await Promise.all([
    confirmMaterialReceipt(db, id, "admin-fixture-1"),
    confirmMaterialReceipt(db, id, "admin-fixture-2"),
  ])
  assert.deepEqual(outcomes.sort(), ["already-confirmed", "confirmed"])

  const snapshot = (await ref.get()).data()
  assert.equal(snapshot.estado, "confirmada")
  assert.equal(typeof snapshot.confirmadoEm, "string")
  const lots = await db.collection("area_material_stock_lots").where("rececaoId", "==", id).get()
  const movements = await db.collection("area_material_stock_movements").where("rececaoId", "==", id).get()
  assert.equal(lots.size, 2)
  assert.equal(movements.size, 2)
  assert.equal(movements.docs.reduce((sum, d) => sum + d.get("quantidade"), 0), 14.5)
  for (const lot of lots.docs) {
    const stored = lot.data()
    assert.equal(JSON.stringify(stored).includes("Caderno genérico"), false)
    assert.equal(typeof stored.dadosPrivados, "object")
  }
  assert.equal(await confirmMaterialReceipt(db, id, "admin-fixture-3"), "already-confirmed")
  assert.equal((await db.collection("area_material_stock_movements").where("rececaoId", "==", id).get()).size, 2)
})

test("invalid, absent or already confirmed receipts do not add stock", async () => {
  assert.equal(await confirmMaterialReceipt(db, "unknown" + unique, "admin"), "not-found")
  const id = "invalid" + unique
  const ref = db.collection("area_material_receptions").doc(id)
  await ref.create({
    ...sealMaterialReception({
      estado: "cancelada",
      itens: [{ categoria: "Teste", descricao: "Material teste", quantidade: 2, unidade: "un", estado: "novo" }],
    }, ref.path),
    criadoEm: new Date().toISOString(),
  })
  assert.equal(await confirmMaterialReceipt(db, id, "admin"), "invalid-state")
  assert.equal((await db.collection("area_material_stock_lots").where("rececaoId", "==", id).get()).size, 0)
})

test("membership intention migration is dry-run by default and idempotently removes cleartext in emulator", async () => {
  const ref = db.collection("area_membership_intentions").doc("synthetic" + unique)
  const fixture = {
    nome: "Pessoa Sintética",
    email: "ficcao@example.invalid",
    telefone: "000000000",
    mensagem: "Pedido de adesão simulado",
    estado: "pendente",
    tipo: "adesao",
    consentimento: true,
    criadoEm: new Date().toISOString(),
  }
  await ref.create(fixture)
  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, ref.id), "legacy")
  assert.equal((await ref.get()).get("nome"), "Pessoa Sintética")

  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, ref.id, { apply: true }), "migrated")
  const encrypted = (await ref.get()).data()
  assert.equal(classifyMembershipIntention(encrypted), "encrypted")
  for (const secret of ["Pessoa Sintética", "ficcao@example.invalid", "000000000", "Pedido de adesão simulado"]) {
    assert.equal(JSON.stringify(encrypted).includes(secret), false)
  }
  assert.equal(encrypted.nome, undefined)
  assert.equal(encrypted.email, undefined)
  assert.equal(encrypted.estado, "pendente")
  assert.equal(openMembershipIntention(encrypted, ref.path).nome, "Pessoa Sintética")
  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, ref.id, { apply: true }), "encrypted")

  const refNew = db.collection("area_membership_intentions").doc("newsynthetic" + unique)
  await refNew.create(sealMembershipIntention(fixture, refNew.path))
  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, refNew.id, { apply: true }), "encrypted")
  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, "missing" + unique), "missing")
})

test("malformed mixed plaintext/ciphertext documents fail migration without erasure", async () => {
  const ref = db.collection("area_membership_intentions").doc("conflict" + unique)
  const sealed = sealMembershipIntention({ nome: "Exemplo", email: "safe@example.invalid", tipo: "adesao" }, ref.path)
  await ref.create({ ...sealed, nome: "exposto" })
  assert.equal(await migrateMembershipIntentionInEmulator(db, FieldValue, ref.id, { apply: true }), "invalid")
  assert.equal((await ref.get()).get("nome"), "exposto")
})

test("monetary donation PII is encrypted with totals and relationship keys preserved", async () => {
  const donation = db.collection("area_financial_transactions").doc("donation" + unique)
  const fixture = {
    tipo: "doacao", valorMinor: 2500, moeda: "XOF", data: "2026-10-25",
    metodo: "transferencia", socioId: "member-synthetic",
    doador: "Pessoa Inventada", notas: "Ajuda sintética", createdBy: "admin-synthetic",
  }
  await donation.create(sealFinancialRecord(fixture, donation.path, "transaction"))
  const raw = (await donation.get()).data()
  assert.equal(raw.valorMinor, 2500)
  assert.equal(raw.moeda, "XOF")
  assert.equal(raw.socioId, "member-synthetic")
  for (const secret of ["Pessoa Inventada", "Ajuda sintética"]) {
    assert.equal(JSON.stringify(raw).includes(secret), false)
  }
  assert.equal(openFinancialRecord(raw, donation.path, "transaction").doador, "Pessoa Inventada")
  const matching = await db.collection("area_financial_transactions").where("tipo", "==", "doacao")
    .where("socioId", "==", "member-synthetic").get()
  assert.ok(matching.docs.some(doc => doc.id === donation.id))
})

test("quota member label is private while obligation amount and payment query work", async () => {
  const obligation = db.collection("area_quota_obligations").doc("synthetic_" + unique)
  const original = {
    socioId: "member-synthetic", socioNome: "Sócio Sintético",
    periodo: "2026-10", vencimento: "2026-10-30",
    valorMinor: 600, moeda: "XOF",
  }
  await obligation.create(sealFinancialRecord(original, obligation.path, "quota"))
  const raw = (await obligation.get()).data()
  assert.equal(raw.periodo, "2026-10")
  assert.equal(raw.valorMinor, 600)
  assert.equal(JSON.stringify(raw).includes("Sócio Sintético"), false)
  assert.equal(openFinancialRecord(raw, obligation.path, "quota").socioNome, "Sócio Sintético")
  const payment = db.collection("area_financial_transactions").doc("payment" + unique)
  await payment.create(sealFinancialRecord({
    tipo: "quota", obligationId: obligation.id,
    socioId: "member-synthetic", socioNome: "Sócio Sintético",
    periodo: "2026-10", data: "2026-10-25", valorMinor: 200, moeda: "XOF",
    metodo: "dinheiro", notas: "Recibo fictício",
  }, payment.path, "transaction"))
  const receipts = await db.collection("area_financial_transactions")
    .where("obligationId", "==", obligation.id).get()
  assert.equal(receipts.size, 1)
  assert.equal(receipts.docs[0].get("valorMinor"), 200)
  const opened = openFinancialRecord(receipts.docs[0].data(), receipts.docs[0].ref.path, "transaction")
  assert.equal(opened.socioNome, "Sócio Sintético")
  assert.equal(opened.notas, "Recibo fictício")
})

test.after(async () => {
  await terminate(browserDb)
  await deleteClientApp(browserApp)
  await deleteAdminApp(adminApp)
})
