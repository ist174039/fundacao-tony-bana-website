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
