# Secure member registry — implementation and staged rollout

## Scope of PR #6

The current production \`area_socios\` uses \`SHA-256(email)\` document IDs. They are
predictable, even if the \`email\` field itself is later encrypted. This PR
introduces **new-member UUID IDs**, an **HMAC email lookup** and a private
AES-256-GCM envelope before writing \`nome\`, \`email\`, \`telefone\` and
\`observacoes\` to Firestore.

The new workflow is **disabled by default**. Existing members are not migrated.

## Fields

| Collection | Secret fields / metadata | Notes |
| --- | --- | --- |
| \`area_socios\` | \`dadosPrivados\` = AES-GCM(name,email,phone,notes) | \`uid\`, \`dataAdesao\`, \`numeroSocio\`, \`estado\`, audit fields remain queryable and may still be identifying |
| \`area_member_email_index\` | Document ID = keyed HMAC-SHA256(normalized email) | Document body stores \`socioId\` UUID and creation metadata; never email or key |
| \`area_quota_obligations\` | Same stable \`socioId\` UUID | Names encrypted only when finance encryption flag is enabled |
| \`area_financial_transactions\` | Same stable \`socioId\` UUID, \`obligationId\` | Names and notes encrypted only when finance encryption flag is enabled |

A pseudonymous UUID is still personal data when connected to the member.
Firebase Authentication separately stores email and display name within its
service and has its own privacy/contractual obligations.

## Atomic creation and duplicate avoidance

Admin registration in secure mode:
1. Normalize/validate email, generate UUID.
2. Compute HMAC index using **separate 32-byte secret** (never reuse AES key).
3. In one Firestore transaction read the deterministic legacy ID, HMAC index
   and proposed UUID, then create UUID member + email index.
4. Existing legacy/index record -> 409 conflict; no new member created.
5. If any secret is missing, the operation fails closed.

Concurrent attempts for the same email are serialized through the index
document and must result in one creation and one duplicate response.

Member self-link uses a verified Firebase email and the new index first, with
legacy SHA ID fallback; it checks the decrypted member email matches the
verified identity before linking. Historical \`socioId\`, quotas and receipts
are **not rewritten**.

## Configuration safety

\`FTB_SECURE_MEMBER_REGISTRY=true\` enables new UUID + HMAC members.

**Must also enable** \`FTB_ENCRYPT_FINANCIAL_PII=true\` to prevent copies of
the personal member name into plaintext quota/payment records. Registration
is rejected (503) if the secure member mode is enabled without financial
encryption. Quota and receipt APIs also reject unsafe writes against an
already encrypted quota/member.

Secrets:
- \`FTB_DATA_ENCRYPTION_KEYS_JSON\`, AES keyring (separate server secret)
- \`FTB_DATA_ENCRYPTION_ACTIVE_KID\`, AES key version
- \`FTB_MEMBER_INDEX_KEY_B64\`, independent 32-byte HMAC key

These values must be provisioned in approved infrastructure. **Never
commit real keys or paste into Notion.**

Both feature flags remain OFF by default; merging this PR does not
migrate production or activate secure member processing. Avoid reverting
flags after actual secure records are created: mixed-mode writers can
otherwise create duplicate legacy records. Define an operations gate
that prevents rollback to insecure writes.

## Explicit limitations / open gates

- The live member catalog is not migrated and still contains plaintext
  metadata with predictable SHA-256(email) document IDs. Its associated
  quotas and receipts remain untouched.
- The admin member list currently reads up to 1,000 records and sorts
  decrypted names in the server; implement pagination for larger datasets.
- No authenticated API E2E tests with different roles have been run.
- No real production Firebase or Storage Rules were inspected.
- Firebase Auth may independently store identifiable user fields.
- No historical-data migration, finance FX reconciliation or key rotation
  has been applied to production.
- The legacy email self-link lookup remains available during transitional
  mode and must be removed only after controlled migration.
- A **future** migration of existing member document IDs must update or
  bridge every \`socioId\`, obligation ID, account association and receipt
  reference transactionally. It needs an approval, backup, journal and
  controlled rollback; this PR **does not attempt it**.

## Test scenarios

- Pure crypto/unit tests: no personal plaintext, AAD binding, legacy
  compatibility, differing HMAC index vs SHA256(email).
- Firebase Emulator: two concurrent registrations of same email -> one
  created, one duplicate; email index contains only UUID; duplicate legacy
  member blocks creation; self lookup finds either format; quota/receipt
  foreign keys still reference the UUID and original financial values.
- CI: test:security + Firestore Emulator + Next.js build must all pass.
- Use only synthetic emails ending \`example.invalid\`.

## Related Notion tracking

FTB-RISK-022, FTB-ACT-039, FTB-ACT-043 and FTB-TC-047.
