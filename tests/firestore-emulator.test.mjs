/**
 * True Firebase Emulator integration tests.
 * Refuse to execute unless the locally hosted emulator and demo project are set.
 */
import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { initializeApp as initializeAdminApp, deleteApp as deleteAdminApp } from "firebase-admin/app"
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore"
import { initializeApp as initializeClientApp, deleteApp as deleteClientApp } from "firebase/app"
import { getFirestore as getClientFirestore, connectFirestoreEmulator, doc, getDoc } from "firebase/firestore"
import { encryptJson } from "../lib/server/field-encryption.mjs"
import { sealMaterialReception, openMaterialReception } from "../lib/server/private-records.mjs"
import { confirmMaterialReceipt } from "../lib/server/material-stock.mjs"

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

test.after(async () => {
  await browserDb._terminate?.()
  await deleteClientApp(browserApp)
  await deleteAdminApp(adminApp)
})
