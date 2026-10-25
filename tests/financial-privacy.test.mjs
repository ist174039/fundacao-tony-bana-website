import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import { sealFinancialRecord, openFinancialRecord } from "../lib/server/financial-privacy.mjs"

function withKey(run) {
  const oldKeys = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  const oldId = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  try {
    process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = JSON.stringify({ finance: randomBytes(32).toString("base64") })
    process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "finance"
    return run()
  } finally {
    if (oldKeys === undefined) delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = oldKeys
    if (oldId === undefined) delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = oldId
  }
}

test("donor name and notes are not stored in cleartext but accounting totals remain", () => withKey(() => {
  const path = "area_financial_transactions/synthetic1"
  const input = {
    tipo: "doacao", valorMinor: 500, moeda: "XOF", data: "2026-10-25",
    metodo: "dinheiro", doador: "Pessoa Inventada", notas: "Ajuda a criança inventada",
  }
  const sealed = sealFinancialRecord(input, path, "transaction")
  assert.equal(sealed.valorMinor, 500)
  assert.equal(sealed.moeda, "XOF")
  assert.equal(sealed.tipo, "doacao")
  assert.equal(JSON.stringify(sealed).includes("Pessoa Inventada"), false)
  assert.equal(JSON.stringify(sealed).includes("Ajuda a criança inventada"), false)
  assert.deepEqual(openFinancialRecord(sealed, path, "transaction").doador, "Pessoa Inventada")
  assert.throws(() => openFinancialRecord(sealed, path + "-different", "transaction"))
  assert.throws(() => openFinancialRecord({ ...sealed, doador: "exposto" }, path, "transaction"))
}))

test("quota member label is private while period, due and balances stay queryable", () => withKey(() => {
  const path = "area_quota_obligations/member1_2026-10"
  const input = {
    socioId: "member1", socioNome: "Sócio Sintético",
    periodo: "2026-10", vencimento: "2026-10-30",
    valorMinor: 1000, moeda: "XOF",
  }
  const result = sealFinancialRecord(input, path, "quota")
  assert.equal(result.socioId, "member1")
  assert.equal(result.periodo, "2026-10")
  assert.equal(result.valorMinor, 1000)
  assert.equal(JSON.stringify(result).includes("Sócio Sintético"), false)
  assert.equal(openFinancialRecord(result, path, "quota").socioNome, "Sócio Sintético")
  assert.throws(() => openFinancialRecord(result, path, "transaction"))
}))

test("old transactions require explicitly authorized legacy-read mode", () => {
  const legacy = { valorMinor: 200, doador: "Nome Antigo", notas: "Nota velha" }
  assert.throws(() => openFinancialRecord(legacy, "area_financial_transactions/old", "transaction"))
  assert.equal(openFinancialRecord(legacy, "area_financial_transactions/old", "transaction", { allowLegacy: true }).doador, "Nome Antigo")
})

test("missing encryption key rejects financial secure writes instead of fallback", () => {
  const v = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  const k = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  try {
    delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    assert.throws(() => sealFinancialRecord({ tipo: "doacao", notas: "teste" }, "area_financial_transactions/new", "transaction"))
  } finally {
    if (v === undefined) delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = v
    if (k === undefined) delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = k
  }
})
