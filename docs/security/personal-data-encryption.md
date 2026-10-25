# Personal-data encryption — Fundação Tony Bana

**Implementation status:** first increment; must be reviewed and tested with synthetic data before enabling the modules. This does not encrypt legacy \`area_socios\`, quota, financial and membership records at the application layer.

## Guarantees and scope

Firestore already encrypts all stored data at rest using Google-managed keys, by default.
This increment adds **independent server-side AES-256-GCM encryption of selected
personal and free-text fields** before sending them to Firestore.
The encryption key is **not** stored in Firestore, a source file or the browser.

Implemented now:
- \`area_schools\`: \`endereco\`, \`telefone\`, \`email\` stored in \`dadosPrivados\` envelope;
  institutional name, school code, location and status remain queryable in plaintext.
- \`area_schools/{schoolCode}/contactos\`: name, role, contact channels and dates all
  encrypted in \`dadosPrivados\`; audit metadata remains pseudonymous.
- \`area_material_receptions\`: donor identity and channels, origin, purpose, receipt reference,
  free-text notes and the complete items array are encrypted in \`dadosPrivados\`.
- \`area_material_stock_lots\`: the item category, description and condition are
  encrypted; stock quantity, unit, movement IDs and audit IDs remain queryable.
- API decryption happens **only after** the existing admin authorization check.

### Data model

\`\`\`mermaid
flowchart LR
    User["Operador autorizado"] --> API["Next.js API: autorização"]
    API --> Enc["AES-256-GCM com AAD"]
    Enc --> Store[("Firestore: campos cifrados")]
    KMS["Vercel secret / gestor de chaves"] --> Enc
    Store --> Dec["Decifragem servidor autorizada"] --> API
\`\`\`

Authenticated encryption uses an independent random 96-bit IV and 128-bit auth tag
per encryption. AAD binds ciphertext to the exact Firestore document path and field
name. Each envelope stores the non-secret algorithm, key ID, IV, ciphertext and tag.
Wrong key, altered bytes, altered AAD or unknown format cause a **fail-closed** error.
A different active key ID can be used for new writes while old keys remain available
for reads.

## Required secrets — set in a secure secret manager, never Git

- \`FTB_DATA_ENCRYPTION_KEYS_JSON\`: JSON object mapping key versions to base64-encoded
  32-byte cryptographically random keys.
- \`FTB_DATA_ENCRYPTION_ACTIVE_KID\`: key ID to use for new records.

**Example contains no real key:**

\`\`\`text
FTB_DATA_ENCRYPTION_KEYS_JSON={"key-2026":"<base64-encoding-of-32-random-bytes>"}
FTB_DATA_ENCRYPTION_ACTIVE_KID=key-2026
\`\`\`

Generate keys locally through an audited secret management process (e.g., \`openssl rand -base64 32\`);
store them through an approved secret manager, with tight IAM and recovery procedures.
Never paste secret values into Notion, tickets, logs, GitHub or chat.

**Fail closed:** the schools and material reception APIs return 503 unless both
Firebase Admin and field encryption are configured. Their feature flags
(\`FTB_SCHOOLS_ENABLED\`, \`FTB_MATERIAL_DONATIONS_ENABLED\`) remain **off by default**.

## Legacy and future data

Firestore managed at-rest encryption continues to protect **all** collections,
including legacy \`area_socios\` and finance records; however those collections
still contain some *application-readable plaintext fields*. Do **not** claim that
all legacy personal fields have been converted to application-layer ciphertext.

Next migration requires:
1. Inventory and field classification for \`area_socios\`, member intentions,
   \`area_financial_transactions\`, user profiles and attached documents.
2. Encryption-aware queries (use random document IDs and HMAC blind indexes only
   if exact-match lookup is essential, with a separate key). AES-GCM ciphertext
   cannot be directly searched, sorted or filtered.
3. A reversible, audited and idempotent staged migration in TEST with synthetic
   datasets; a point-in-time backup and rollback plan before production.
4. A migration of old school or reception documents: no plaintext fallback on the
   new private endpoints. Old school documents are redacted and marked as needing
   migration; old contact/reception records fail closed until migrated.
5. Private file storage, access review, key rotation and withdrawal, retention,
   DSAR/deletion, incident response and crypto-key backup without sharing keys.
6. An enterprise KMS-backed envelope encryption design if organisational
   requirements demand hardware-managed keys and central audit of key operations.

## Validation and release gates

- [ ] \`npm run test:security\` verifies encrypt/decrypt, random IVs, AAD swapping,
      tampering, rotation, missing keys and absence of private plaintext in serializers.
- [ ] \`npm run build\` succeeds in GitHub Actions.
- [ ] Firebase Emulator integration tests demonstrate encrypted Firestore writes,
      admin-only reads, updates and stock confirmation.
- [ ] Search Firestore TEST snapshots for representative personal plaintext and
      verify none in the protected fields or operational logs.
- [ ] Key rotation and missing/invalid key behaviour validated; secure backup.
- [ ] Legal responsibilities, key custodians, region/transfer assessment and
      risk acceptance agreed before personal data enters production.

**Security model:** ciphertext is not a substitute for authorization, TLS,
access logging, least privilege, backups or purpose limitation. Application
server processes with access to encryption keys can decrypt; therefore protect
Vercel deployments, runtime secrets, infrastructure and service accounts.
