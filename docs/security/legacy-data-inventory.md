# Inventário da PII legada — sem mutações em produção

O primeiro incremento de cifragem cobre **somente os módulos novos**.
Antes de transformar \`area_socios\`, quotas, donativos financeiros, candidaturas,
perfis e ficheiros, é obrigatório mapear os campos e consultas que dependem deles.

| Firestore collection | Campos pessoais candidatos | Consultas/integrações que não podem quebrar |
| --- | --- | --- |
| \`area_socios\` | \`nome\`, \`email\`, \`telefone\`, \`observacoes\` | \`where(uid == ...)\`, \`orderBy(nome)\`, link por email / ID SHA-256, gestão de utilizadores, quotas |
| \`area_quota_obligations\` | \`socioNome\` | \`where(socioId == ...)\`, período e saldo financeiro |
| \`area_financial_transactions\` | \`doador\`, \`socioNome\`, \`notas\` | \`where(socioId == ...)\`, \`where(tipo == quota)\`, \`where(obligationId == ...)\`, reconciliação |
| \`area_membership_intentions\` | \`nome\`, \`email\`, \`telefone\`, \`mensagem\` | \`orderBy(criadoEm)\`, receção pública e triagem |
| Firebase Auth / editoriais | \`displayName\`, \`email\`, meios de contacto e eventuais conteúdos identificáveis | Fluxos de login, permissões e administração de contas; políticas próprias do provedor |

## Critical compatibility and privacy decision

Current member document IDs are **unsalted SHA-256(email)** in membership
creation and self-linking. This is predictable via dictionary attacks:
encrypting \`email\` alone does not protect against reconstruction of
an email from its document ID. Do **not** rewrite these IDs in production
without also migrating quota/receipt foreign keys, authentication links,
lookup paths, retries and rollback. Prefer random member document IDs
and an independent, keyed HMAC blind index for exact email lookup, once
the migration ADR and compatibility tests are approved.

AES-256-GCM randomized ciphertext is neither queryable nor sortable;
avoid moving legacy \`nome\` and \`email\` into ciphertext without
rewriting order/search/association consumers. Separate query metadata,
keyed blind indexes with a **different** key, and all authorised reads.

## Next safe migration stages

1. Export schema/field inventory without exporting values into Notion, tickets or logs.
2. Review legal basis, retention and the actual Firebase Rules in production.
3. Create a TEST dataset of synthetic members, quotas, receipts and intentions.
4. Add encrypted serializers and dual readers behind a feature flag; new writes
   to TEST only, with no plaintext fallback after final migration.
5. Implement immutable migration journal, dry run, idempotent conversion,
   backups and rollback; check duplicate/lookup constraints.
6. Run Firestore Emulator tests for membership, quotas, financial reconciliation,
   role changes and account self-linking before considering production.
7. Choose a maintenance window and explicit human approval for any real-data migration.

**Current state:** no historical data read or migrated by this change.
Firebase-managed at-rest encryption remains separate from application-layer
encryption. No production secrets may be copied into the repository or Notion.
