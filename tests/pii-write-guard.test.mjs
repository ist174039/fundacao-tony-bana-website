import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { reviewMembershipIntention } from "../lib/server/intention-review.mjs"

const text = (path) => readFileSync(path, "utf8")

test("unauthorised privacy downgrade cannot create member from a legacy application", async () => {
  const writes = []
  const db = {
    collection(name) {
      assert.equal(name, "area_membership_intentions")
      return { doc(id) { return { id, path: name + "/" + id } } }
    },
    async runTransaction(callback) {
      return callback({
        async get() {
          return {
            exists: true,
            get(field) { return field === "estado" ? "pendente" : undefined },
            data() { return { tipo: "adesao", nome: "Fictício", email: "test@example.invalid" } },
          }
        },
        create(...args) { writes.push(["create", args]) },
        update(...args) { writes.push(["update", args]) },
      })
    },
  }
  const denied = await reviewMembershipIntention(db, "synthetic01", "aceite", "admin", { secureMembers: false })
  assert.deepEqual(denied, { status: "secure-mode-required" })
  assert.deepEqual(writes, [])

  const rejection = await reviewMembershipIntention(db, "synthetic01", "rejeitado", "admin", { secureMembers: false })
  assert.deepEqual(rejection, { status: "reviewed-ok" })
  assert.equal(writes.length, 1)
  assert.equal(writes[0][0], "update")
})

test("public applications write only encrypted payloads", () => {
  const route = text("app/api/membership-intentions/route.ts")
  assert.ok(route.includes('FTB_ENCRYPT_MEMBERSHIP_INTENTIONS !== "true" || !isFieldEncryptionConfigured()'))
  assert.ok(route.includes('ref.create(sealMembershipIntention(payload, ref.path))'))
  assert.ok(!route.includes("collection.add(payload)"))
})

test("member creation and profile updates require secure configuration", () => {
  const members = text("app/api/area/socios/route.ts")
  const update = text("app/api/area/socios/[id]/route.ts")
  assert.ok(members.includes("!secureMembers || !isFieldEncryptionConfigured() || !isMemberIndexConfigured()"))
  assert.ok(members.includes('FTB_ENCRYPT_FINANCIAL_PII !== "true"'))
  assert.ok(!members.includes('createHash("sha256")'))
  assert.ok(update.includes("!secureWrites || !isFieldEncryptionConfigured()"))
})

test("financial POST endpoints never write an unencrypted new record", () => {
  for (const path of ["app/api/area/quotas/route.ts", "app/api/area/transactions/route.ts"]) {
    const route = text(path)
    assert.ok(route.includes("!secureFinance || !isFieldEncryptionConfigured()"), path)
    assert.ok(!route.includes("secureFinance ? sealFinancialRecord"), path)
  }
})
