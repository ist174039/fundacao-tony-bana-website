import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes } from "node:crypto"
import {
  sealMembershipIntention, openMembershipIntention, classifyMembershipIntention,
  memberEmailBlindIndex, newMemberDocumentId,
} from "../lib/server/membership-privacy.mjs"

const KEYS = ["FTB_DATA_ENCRYPTION_KEYS_JSON", "FTB_DATA_ENCRYPTION_ACTIVE_KID", "FTB_MEMBER_INDEX_KEY_B64"]
function withKeys(action) {
  const before = Object.fromEntries(KEYS.map(k => [k, process.env[k]]))
  try {
    process.env.FTB_DATA_ENCRYPTION_KEYS_JSON = JSON.stringify({ v1: randomBytes(32).toString("base64") })
    process.env.FTB_DATA_ENCRYPTION_ACTIVE_KID = "v1"
    process.env.FTB_MEMBER_INDEX_KEY_B64 = randomBytes(32).toString("base64")
    return action()
  } finally {
    for (const [k, v] of Object.entries(before)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}
const example = {
  nome: "Nome Inventado", email: "fiction@example.invalid", telefone: "000000",
  mensagem: "Pretendo aderir", tipo: "adesao", estado: "pendente",
  consentimento: true, criadoEm: "2026-10-25T12:00:00Z",
}

test("seals every membership intention personal field and preserves metadata", () => withKeys(() => {
  const path = "area_membership_intentions/example1"
  const sealed = sealMembershipIntention(example, path)
  const json = JSON.stringify(sealed)
  for (const term of ["Nome Inventado", "fiction@example.invalid", "000000", "Pretendo aderir"]) {
    assert.equal(json.includes(term), false)
  }
  assert.equal(sealed.tipo, "adesao")
  assert.equal(sealed.estado, "pendente")
  assert.equal(classifyMembershipIntention(sealed), "encrypted")
  const result = openMembershipIntention(sealed, path)
  assert.equal(result.nome, example.nome)
  assert.equal(result.email, example.email)
  assert.equal(result.mensagem, example.mensagem)
  assert.throws(() => openMembershipIntention(sealed, path + "-copy"))
}))

test("legacy reads require explicit allowance and mixed fields fail closed", () => withKeys(() => {
  assert.equal(classifyMembershipIntention(example), "legacy")
  assert.throws(() => openMembershipIntention(example, "area_membership_intentions/legacy1"))
  assert.equal(openMembershipIntention(example, "area_membership_intentions/legacy1", { allowLegacy: true }).nome, example.nome)
  const p = "area_membership_intentions/example1"
  const sealed = sealMembershipIntention(example, p)
  assert.equal(classifyMembershipIntention({ ...sealed, nome: "leaked" }), "invalid")
  assert.throws(() => openMembershipIntention({ ...sealed, nome: "leaked" }, p, { allowLegacy: true }))
}))

test("blind email index uses independent secret HMAC, deterministic normalization", () => withKeys(() => {
  const id1 = memberEmailBlindIndex(" TEST@example.invalid ")
  const id2 = memberEmailBlindIndex("test@EXAMPLE.invalid")
  assert.equal(id1, id2)
  assert.match(id1, /^[0-9a-f]{64}$/)
  assert.notEqual(id1, memberEmailBlindIndex("other@example.invalid"))
  const oldKey = process.env.FTB_MEMBER_INDEX_KEY_B64
  process.env.FTB_MEMBER_INDEX_KEY_B64 = randomBytes(32).toString("base64")
  assert.notEqual(id1, memberEmailBlindIndex("test@example.invalid"))
  process.env.FTB_MEMBER_INDEX_KEY_B64 = oldKey
  assert.throws(() => memberEmailBlindIndex("not-email"))
  delete process.env.FTB_MEMBER_INDEX_KEY_B64
  assert.throws(() => memberEmailBlindIndex("test@example.invalid"))
}))
test("new member IDs are not deterministically derived from email", () => {
  assert.notEqual(newMemberDocumentId(), newMemberDocumentId())
})
