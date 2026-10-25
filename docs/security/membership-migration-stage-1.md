# Phase 1: secure adhesion requests without breaking member accounting

Source of truth: \`main\`; do not run any production data migration from this PR.

## Inventory finding

The public \`POST /api/membership-intentions\` previously stored \`nome\`,
\`email\`, \`telefone\` and \`mensagem\` in cleartext application fields.
The private \`GET /api/area/intentions\` reads the same collection and must
temporarily support existing historical documents during rollout.

## Implemented

- \`sealMembershipIntention\` encrypts all four fields with AES-256-GCM
  and document-specific AAD before Firestore persistence.
- Metadata used for workflow (\`tipo\`, \`estado\`, \`consentimento\`,
  \`criadoEm\`) remains queryable. No plaintext name/email/phone/message
  is saved in secure mode.
- \`openMembershipIntention\` reads new encrypted documents and, **only
  after admin authorization**, can handle historical records through the
  explicit \`allowLegacy: true\` transition path. Mixed formats are rejected.
- \`FTB_ENCRYPT_MEMBERSHIP_INTENTIONS=true\` activates secure writes.
  If key configuration is missing, **POST returns 503, never silently
  falls back to plaintext**. The feature flag is OFF by default to avoid
  changing a live public form until key custody and release validation.
- A **synthetic-data-only** migration function can dry-run and atomically
  update old documents inside Firestore Emulator. It refuses to run
  outside \`demo-*\` projects on \`127.0.0.1:8080\`. This is a test
  of the migration technique, **not production migration tooling**.
- Keyed \`HMAC-SHA256\` email blind index and random UUID document ID
  primitives have unit tests for a future member-ID migration. They
  do not yet modify members, quotas or donation history.

## Secrets and gates

- \`FTB_DATA_ENCRYPTION_KEYS_JSON\`: keyring for AES-256-GCM.
- \`FTB_DATA_ENCRYPTION_ACTIVE_KID\`: active AES key version.
- \`FTB_MEMBER_INDEX_KEY_B64\`: **independent** HMAC index key for
  future member lookup only (not yet used by production APIs).
- Never commit keys, paste them into Notion, or copy real contacts into
  test fixtures.

Do not set the secure-mode flag until a responsible operator configures
the server keyring and validates the public form and admin workflow in a
TEST environment. During a staged rollout, audit whether any older
deployment or environment continues to write historical plaintext.

## Migration sequence (future production change)

1. Obtain the real Firebase security rules and review key custody.
2. Complete approval of purposes, legal responsibilities and retention.
3. Stop or account for concurrent writes; create a point-in-time backup.
4. Inventory and count plaintext records **without extracting values to logs**.
5. Implement an independently reviewed, production-specific migration
   with dry-run, checkpoint/journal, paging, throttling and rollback.
6. Keep admin dual-read only for a bounded, reviewed transition window.
7. Prove reconciliation and eliminate plaintext fields after acceptance.
8. Disable legacy compatibility and monitor for future cleartext writes.

## Member-ID migration is separate

Current \`area_socios\` document IDs are unsalted \`SHA-256(email)\` and
are referenced by \`area_quota_obligations\`, financial transaction
\`socioId\`, the member self-link flow and Firebase user management.

**Do not change them in-place without reworking every dependent query.**
The helper \`memberEmailBlindIndex\` exists for a future explicit ADR.
It is not deployed as a query or uniqueness mechanism.

## Evidence / limitations

- Node unit tests: randomized ciphertext, tamper rejection, legacy opt-in,
  mixed-format refusal, HMAC normalization and key separation.
- Firestore Emulator tests: dry-run non-mutation, encrypted document rewrite,
  preservation of workflow metadata, repeat idempotence, conflict rejection.
- CI build and emulator tests must pass before any PR integration to \`main\`.
- Emulator test rules are **not production Firestore Rules**.
- No production secret provision, database migration, encryption of old
  member/financial records or cross-school RBAC in this increment.
