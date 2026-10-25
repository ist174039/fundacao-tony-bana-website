# Area access — security hardening and verification

This document tracks the first security increment of the Foundation platform.
It does **not** certify the application for processing pupil data.

## Changes in this branch

1. Every existing Firebase Admin ID-token verification entry point checks revocation
   via `verifyIdToken(token, true)`, including membership self-linking.
2. Email-based admin allowlisting requires `email_verified === true`.
   Server-configured UIDs and trusted custom claims remain valid admin mechanisms.
3. Admin access rules are isolated into a pure, unit-tested policy.
4. Execute `npm run test:security` to run deterministic tests without Firebase access.

**Deployment note:** revocation verification adds a Firebase Auth backend lookup
to each verification. Review latency and quota during staging tests. A revoked
token now fails authentication; verify that users can sign in again as expected.

## Firestore / Storage security rules — not yet verified

The repository's `docs/area-de-trabalho.md` states that Firestore rules for
`area_socios`, `area_quota_obligations`,
`area_financial_transactions` and `area_membership_intentions`
are not versioned here. **Do not deploy a replacement rules file without first
retrieving the full active rules**, which may also govern the public website.

The design goal for these four private collections is **deny all direct
client SDK reads and writes**. Access to them must remain via authorized
Next.js server routes using Firebase Admin. When merging with the real rules,
review overlapping `match` statements; Firestore grants access if **any**
matching `allow` condition passes. A specific deny cannot override a broader allow.

Example fragment **to merge only after reviewing all existing matches**:

```text
match /area_socios/{document=**} { allow read, write: if false; }
match /area_quota_obligations/{document=**} { allow read, write: if false; }
match /area_financial_transactions/{document=**} { allow read, write: if false; }
match /area_membership_intentions/{document=**} { allow read, write: if false; }
```

Verify the final merged rules with Firebase Emulator Suite in a separate TEST
project, with anonymous users, members, admins, and malicious cross-user
document IDs. Rules do **not** protect access via Firebase Admin SDK;
authorization inside the API remains mandatory.

Storage rules must be reviewed separately: photos and supporting evidence
involving minors should be private-by-default, served through explicitly
authorized and short-lived access paths. Do not publish them during this increment.

## Release acceptance checklist

- [ ] `npm run test:security` passes on the PR commit.
- [ ] `npm run build` passes in an isolated build.
- [ ] TEST Firebase credentials configured securely; no keys in Git.
- [ ] Disabled/revoked user with previously issued token is denied by all
      `/api/area/*` endpoints and self-linking.
- [ ] Unverified email on admin allowlist is denied; verified allowlist
      email, UID and trusted custom claim work as expected.
- [ ] Active Firestore and Storage rules exported, reviewed, versioned,
      and regression-tested before any change to production.
- [ ] Financial legacy AOA/XOF treatment decided and reconciled.
- [ ] Legal basis, Foundation/school roles, minimization and DPIA triage
      approved before any **real pupils' records** are ingested.
- [ ] School isolation tests performed with synthetic schools and pupils
      after the school module and ABAC rules actually exist.

## Scope

This increment improves the existing *admin/socio* access model only.
It does not implement the planned school/pupil modules, a complete RBAC/ABAC
policy, new Firestore rules, or a production migration.


## Increment 2 — material donation and institutional school registry (gated)

Implemented in the same feature branch for review:
- Admin-only \`/api/area/schools\` (school registry) with \`/api/area/schools/[code]/contacts\`;
- Admin-only \`/api/area/material-receptions\` creates a **pending** material reception with donor, items, quantities, condition and physical receipt reference;
- \`POST /api/area/material-receptions/[id]/confirm\` performs a Firestore **transaction** to create one stock lot and one stock entrance movement per item, while marking the reception **confirmed** exactly once;
- Admin-only UI tabs added to \`/platform/area\` for the two workflows, with validation and unit-test specifications.

**Safe defaults**: both \`FTB_SCHOOLS_ENABLED\` and
\`FTB_MATERIAL_DONATIONS_ENABLED\` must be explicitly \`true\`; otherwise the corresponding API responds 503. Leave both **disabled** in production until rules, TEST project, test identities, supplier contact privacy and audit procedures are approved.

**Known scope limitations**
- Only admins can use the initial school/material workflows; school-level RBAC is not implemented.
- Stock can be added but not yet distributed, transferred, corrected or reconciled. Do not interpret stock lots as a complete inventory module.
- Material donor details are embedded in the reception during this increment. A canonical person/entity registry must replace duplication in a later milestone.
- The \`referenciaDocumento\` field is a **reference to an existing physical guide**, not a scanned receipt or uploaded photograph. Secure uploads, content screening, private Storage and retrieval audit are separate pending requirements.
- Donations received in poor condition are recorded as received, but must not be distributed before quality review in a later workflow.
- Confirmed reception records and stock movements must be treated as immutable in operational processes; corrections will require a dedicated audited reversal process.
- Firestore/Storage Security Rules must be checked before enabling flags on any environment with real contacts or donors.

**Tests**: \`npm run test:security\` runs the policy, school validation, material validation and static transaction/feature-flag checks. These tests do **not** replace Firestore Emulator integration tests for concurrent confirmation or privacy access tests.
