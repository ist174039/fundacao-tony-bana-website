import test from "node:test"
import assert from "node:assert/strict"
import { parseMaterialReception, MaterialReceptionError } from "../lib/server/material-reception.mjs"
import { readFileSync } from "node:fs"

const sample = {
  nomeDoador: "Empresa Solidária",
  tipoDoador: "organizacao",
  emailDoador: "apoio@example.org",
  referenciaDocumento: "GUIA-2026-001",
  itens: [
    { categoria: "Material escolar", descricao: "Cadernos A5", quantidade: 30, unidade: "un", estado: "novo" },
    { categoria: "Alimentação", descricao: "Arroz", quantidade: 15.5, unidade: "kg", estado: "novo" },
  ],
}
test("records donor, reference and material lines", () => {
  const r = parseMaterialReception(sample)
  assert.equal(r.doador.nome, "Empresa Solidária")
  assert.equal(r.itens[1].quantidade, 15.5)
  assert.equal(r.referenciaDocumento, "GUIA-2026-001")
})
test("anonymous donations discard supplied personal contact data", () => {
  const r = parseMaterialReception({ ...sample, anonimo: true, telefoneDoador: "123" })
  assert.equal(r.doador.nome, "Anónimo")
  assert.equal(r.doador.email, "")
  assert.equal(r.doador.telefone, "")
})
test("rejects invalid quantities, units, condition and too many lines", () => {
  for (const bad of [
    { quantidade: -1 }, { quantidade: "1" }, { quantidade: 0 },
    { quantidade: Number.POSITIVE_INFINITY }, { quantidade: 0.1234 },
    { unidade: "bad" }, { estado: "inexistente" },
  ]) {
    assert.throws(() => parseMaterialReception({
      ...sample, itens: [{ ...sample.itens[0], ...bad }],
    }), MaterialReceptionError)
  }
  assert.throws(() => parseMaterialReception({ ...sample, itens: [] }), MaterialReceptionError)
  assert.throws(() => parseMaterialReception({ ...sample, itens: Array(51).fill(sample.itens[0]) }), MaterialReceptionError)
})
test("rejects invalid donor name and email", () => {
  assert.throws(() => parseMaterialReception({ ...sample, nomeDoador: "A" }), MaterialReceptionError)
  assert.throws(() => parseMaterialReception({ ...sample, emailDoador: "not-an-email" }), MaterialReceptionError)
})
test("does not accept forged confirmation or available stock attributes", () => {
  const r = parseMaterialReception({ ...sample, estado: "confirmada", confirmadoPor: "fake", stock: 9999 })
  assert.equal(Object.hasOwn(r, "estado"), false)
  assert.equal(Object.hasOwn(r, "confirmadoPor"), false)
  assert.equal(Object.hasOwn(r, "stock"), false)
})
test("stock confirmation uses an atomic transaction and both endpoints are gated", () => {
  const confirmation = readFileSync("lib/server/material-stock.mjs", "utf8")
  const endpoint = readFileSync("app/api/area/material-receptions/[id]/confirm/route.ts", "utf8")
  const reception = readFileSync("app/api/area/material-receptions/route.ts", "utf8")
  assert.match(confirmation, /runTransaction/)
  assert.match(confirmation, /transaction.create\(movement/)
  assert.match(confirmation, /transaction.update\(ref/)
  assert.match(endpoint, /FTB_MATERIAL_DONATIONS_ENABLED/)
  assert.match(reception, /FTB_MATERIAL_DONATIONS_ENABLED/)
})
test("material receipt creation does not return persisted private donor data", () => {
  const endpoint = readFileSync("app/api/area/material-receptions/route.ts", "utf8")
  assert.match(endpoint, /rececao:\s*\{\s*id:\s*ref\.id,\s*numero,\s*estado:\s*"pendente"\s*\}/)
  assert.doesNotMatch(endpoint, /rececao:\s*\{\s*id:\s*ref\.id,\s*\.\.\.data/)
})
