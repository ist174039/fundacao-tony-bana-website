import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes, createHash } from "node:crypto"
import { createSecureMember, openMember, sealMember, memberEmailMatches, legacyMemberDocumentId } from "../lib/server/member-registry.mjs"
import { memberEmailBlindIndex } from "../lib/server/membership-privacy.mjs"

function withKeys(run) {
  const names = ["FTB_DATA_ENCRYPTION_KEYS_JSON", "FTB_DATA_ENCRYPTION_ACTIVE_KID", "FTB_MEMBER_INDEX_KEY_B64"]
  const previous = Object.fromEntries(names.map(k => [k, process.env[k]]))
  try {
    process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = JSON.stringify({ version1: randomBytes(32).toString("base64") })
    process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "version1"
    process.env.FTB_MEMBER_INDEX_KEY_B64 = randomBytes(32).toString("base64")
    return run()
  } finally {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}

test("secure member has no cleartext personal fields, metadata preserved", () => withKeys(() => {
  const path = "area_socios/90aabfaa-7210-45fa-8ec7-c89f59f360f0"
  const input = {
    nome: "Sócio de Teste", email: "test@example.invalid", telefone: "+0000",
    observacoes: "Nota privada", numeroSocio: "S-001", estado: "ativo", dataAdesao: "2026-10-25",
  }
  const sealed = sealMember(input, path)
  const raw = JSON.stringify(sealed)
  for (const value of ["Sócio de Teste", "test@example.invalid", "+0000", "Nota privada"])
    assert.equal(raw.includes(value), false)
  assert.equal(sealed.numeroSocio, "S-001")
  assert.equal(sealed.dataAdesao, "2026-10-25")
  assert.deepEqual(openMember(sealed, path).nome, input.nome)
  assert.equal(memberEmailMatches(sealed, path, " TEST@EXAMPLE.invalid "), true)
  assert.throws(() => openMember(sealed, path + "-other"))
  assert.throws(() => openMember({ ...sealed, nome: "injected" }, path))
}))

test("legacy socio remains readable only when allowed, consistent with former hash", () => withKeys(() => {
  const email = "test@example.invalid"
  const legacy = { nome: "Sócio Antigo", email, estado: "ativo" }
  const path = "area_socios/" + legacyMemberDocumentId(email)
  assert.equal(legacyMemberDocumentId(email), createHash("sha256").update(email).digest("hex"))
  assert.equal(openMember(legacy, path).nome, "Sócio Antigo")
  assert.throws(() => openMember(legacy, path, { allowLegacy: false }))
}))

test("blind email index is unrelated to unsalted legacy SHA-256 ID", () => withKeys(() => {
  const email = "member@example.invalid"
  const idx = memberEmailBlindIndex(email)
  assert.match(idx, /^[0-9a-f]{64}$/)
  assert.notEqual(idx, legacyMemberDocumentId(email))
}))

test("misconfigured secret prevents secure encryption of member identity", () => {
  const key = process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
  const kid = process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
  try {
    delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    assert.throws(() => sealMember({ nome: "Teste", email: "a@example.invalid" }, "area_socios/uuid-1"))
  } finally {
    if (key === undefined) delete process.env.FTB_DATA_ENCRYPTION_KEYS_JSON
    else process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = key
    if (kid === undefined) delete process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID
    else process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = kid
  }
})
