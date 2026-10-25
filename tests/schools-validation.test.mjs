import test from "node:test"
import assert from "node:assert/strict"
import { parseSchoolInput, parseSchoolContactInput, SchoolValidationError, isSchoolCode } from "../lib/server/schools-validation.mjs"

const input = { codigo: " fntb-001 ", nome: " Escola Solidária ", pais: "Guiné-Bissau", regiao: "Bafatá", municipio: "Bafatá" }

test("normalizes school data and validates code", () => {
  const school = parseSchoolInput(input)
  assert.equal(school.codigo, "FNTB-001")
  assert.equal(school.nome, "Escola Solidária")
  assert.equal(school.estado, "ativa")
  assert.equal(isSchoolCode(school.codigo), true)
})

test("rejects schools with invalid or short names and codes", () => {
  for (const change of [{ codigo: "x" }, { codigo: "../private" }, { nome: "A" }, { pais: "" }]) {
    assert.throws(() => parseSchoolInput({ ...input, ...change }), SchoolValidationError)
  }
})

test("whitelists fields on update and rejects empty patches", () => {
  const update = parseSchoolInput({ nome: "Novo nome", createdBy: "attacker", audit: true }, { partial: true })
  assert.deepEqual(update, { nome: "Novo nome" })
  assert.throws(() => parseSchoolInput({ createdBy: "attacker" }, { partial: true }), SchoolValidationError)
  assert.throws(() => parseSchoolInput({ estado: "apagada" }, { partial: true }), SchoolValidationError)
})

test("requires a valid contact and a reachable channel", () => {
  const contact = parseSchoolContactInput({ nome: "Pessoa Responsável", cargo: "Direção", email: " DIRECAO@EXAMPLE.ORG ", inicio: "2026-10-25" })
  assert.equal(contact.email, "direcao@example.org")
  assert.equal(contact.principal, false)
  assert.throws(() => parseSchoolContactInput({ nome: "Pessoa", cargo: "Direção" }), SchoolValidationError)
  assert.throws(() => parseSchoolContactInput({ nome: "Pessoa", cargo: "Direção", telefone: "123", fim: "2026-02-30" }), SchoolValidationError)
  assert.throws(() => parseSchoolContactInput({ nome: "Pessoa", cargo: "Direção", telefone: "123", inicio: "2026-10-25", fim: "2026-01-01" }), SchoolValidationError)
})

test("school registry must default to disabled in production unless explicitly configured", () => {
  const env = process.env.FTB_SCHOOLS_ENABLED
  assert.notEqual(env, "true", "Tests require safe default unless TEST consciously opts in")
})
