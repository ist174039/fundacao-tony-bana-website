# Monetary donations and member dues — staged PII protection

Status: integration code submitted as a PR against **main**, pending CI acceptance.

## Purpose

In existing Firestore collections, donation \`doador\`, receipt \`notas\` and
quota \`socioNome\` are application-readable personal fields. The new
serializer encrypts these with AES-256-GCM using a fresh IV, document and
type-specific AAD, and versioned keys **before** Firestore persistence.

Protected collections:
- \`area_financial_transactions\`: donor name, member name and free-text notes;
- \`area_quota_obligations\`: member name.

The other metadata remains queryable for financial reconciliation:
\`tipo\`, \`valorMinor\`, \`moeda\`, \`data\`, \`metodo\`, \`obligationId\`,
\`socioId\`, \`periodo\`, \`vencimento\`, audit IDs and timestamps.

## Compatibility and rollout

The new secure write path is enabled **only** when
\`FTB_ENCRYPT_FINANCIAL_PII=true\`. If this is enabled but valid AES keys
have not been provisioned, money receipt and quota creation **fail 503**.
There is no plaintext fallback once the flag is ON.

For safety, the flag is **OFF** by default, so this merge does not change
how the current live finance dashboard works without rollout approval.
The authorized read endpoints can decode encrypted documents and
temporarily handle existing legacy documents.

**Important:** a plaintext legacy record is not magically encrypted
by adding this code. A separate audited migration, with backup,
rollbacks and reconciliation, is required.

## Pending privacy work

- \`area_socios\` still holds member names and emails in application plaintext.
  Member document IDs are currently derived from \`SHA-256(email)\`, so
  they are predictable. The HMAC/UUID helper in the previous PR does not
  change this yet.
- \`socioId\` references remain pseudonymous identifiers, not anonymised data.
- It remains possible to associate payment amounts with a member through
  appropriate joins; internal RBAC and controls remain essential.
- Value denomination and currency conversion for legacy AOA/XOF records
  need independent reconciliation before finance acceptance.
- Storage, finance source documents, tax records, payment processors, grants
  and budget approval flows are beyond this incremental change.

## Acceptance

1. Confirm \`npm run test:security\` and \`npm run build\` are green.
2. Confirm Firestore Emulator tests of encrypted donor notes, member
   labels, retained accounting reference keys and period/amount queries.
3. Test authorised admin/member API flows end to end using synthetic data
   and actual permitted scopes in isolated TEST before enabling the flag.
4. Provision encryption keys in the approved secret manager.
5. Verify production Firestore and Storage rules, key custody, retention and
   auditor evidence independently.
6. Only after finance and legal approval enable the flag in a staged
   environment and monitor for any continued legacy plaintext writes.
7. Do **not** migrate or modify production finance records in this PR.

Never store live finance records or secret key material in GitHub or Notion.
