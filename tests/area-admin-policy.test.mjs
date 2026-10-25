import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  isAreaAdminIdentity,
  isEnvironmentAreaAdminIdentity,
} from "../lib/server/area-admin-policy.mjs"

const allowlists = {
  allowedUids: " user-001 , user-002 ",
  allowedEmails: " Admin@Example.org , other@example.org ",
}

test("rejects absent or incomplete identities", () => {
  assert.equal(isAreaAdminIdentity(null, allowlists), false)
  assert.equal(isAreaAdminIdentity({}, allowlists), false)
  assert.equal(isAreaAdminIdentity({ uid: "" }, allowlists), false)
})

test("trusted admin custom claim grants access", () => {
  assert.equal(isAreaAdminIdentity({ uid: "claim-user", admin: true }, allowlists), true)
})

test("an explicitly allowlisted UID grants access without email", () => {
  assert.equal(isAreaAdminIdentity({ uid: "user-002" }, allowlists), true)
})

test("a verified allowlisted email grants access case-insensitively", () => {
  assert.equal(isAreaAdminIdentity({
    uid: "different-uid",
    email: "admin@example.ORG",
    email_verified: true,
  }, allowlists), true)
})

test("an unverified allowlisted email cannot grant administrator privileges", () => {
  for (const value of [false, undefined, null]) {
    assert.equal(isAreaAdminIdentity({
      uid: "different-uid",
      email: "Admin@example.org",
      email_verified: value,
    }, allowlists), false)
  }
})

test("a non-allowlisted email or an ordinary user is rejected", () => {
  assert.equal(isAreaAdminIdentity({
    uid: "user-003",
    email: "stranger@example.org",
    email_verified: true,
  }, allowlists), false)
  assert.equal(isAreaAdminIdentity({ uid: "user-003" }, allowlists), false)
})

test("environment-managed admin detection excludes custom claims", () => {
  assert.equal(isEnvironmentAreaAdminIdentity({
    uid: "claim-user",
    admin: true,
  }, allowlists), false)
  assert.equal(isEnvironmentAreaAdminIdentity({
    uid: "user-001",
    admin: true,
  }, allowlists), true)
  assert.equal(isEnvironmentAreaAdminIdentity({
    uid: "other-uid",
    email: "ADMIN@EXAMPLE.ORG",
    email_verified: false,
  }, allowlists), false)
})

test("both server token-verification entry points check revocation", () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const helper = readFileSync(resolve(root, "lib/server/firebase-admin.ts"), "utf8")
  const membership = readFileSync(resolve(root, "app/api/area/membership-link/route.ts"), "utf8")
  assert.match(helper, /verifyIdToken\(token,\s*true\)/)
  assert.match(membership, /verifyIdToken\(token,\s*true\)/)
})
