# Fundação Tony Bana — Market Readiness / GO-NO-GO

> Governing source order: [Project Definition & Delivery](https://app.notion.com/p/3ffbe9392b6081b7bbf8dfecdd1362e8) → its operational Notion tables → latest remote GitHub \`main\` → supplementary documentation.
> Baseline observed on 2026-10-25. **Current recommendation: NO-GO.**

## Terminology

This document tracks progress towards a **fully evidenced delivery**, not an estimated engineering effort. A created requirement, a passing unit test, a READY deployment, and a manually approved release are different facts.

The command \`npm run audit:market\` is diagnostic: it emits JSON and exits successfully even with open gates, so regular PR quality checks remain usable. The command \`npm run gate:market -- --sha <candidate-full-SHA> --production-sha <published-full-SHA>\` **fails nonzero** when any mandatory gate is incomplete. The output \`GO_ELIGIBLE_PENDING_HUMAN_DECISION\` is not permission to deploy; an authorised human still makes the final GO decision.

The manifest in \`release/market-readiness.json\` is conservative and does not contain personal data or secret values. A gate marked \`passed\` must link **HTTPS evidence**, the exact candidate SHA, an actual reviewer, and the \`production\` environment. No assistant or CI run should fabricate those attestations.

## Baseline evidence

| Dimension | Finding | Interpretation |
| --- | --- | --- |
| PDD 00–14 | 15 canonical numbered pages exist | Structural presence only; sections and approvals still need review |
| Requirements | 46 records, 15 \`Em implementação\`, 31 \`Por validar\` | **0 approved/verified** at baseline |
| Requirement provenance | 24 of 46 lack a populated \`Fonte\` field | Gap; many may cite their source in body or context, but this property is not populated |
| Architecture Components | 21 records, 4 \`Atual observado\`, 13 \`Proposto\`, 4 \`A validar\` | 4/21 observed in code is **not** 4/21 accepted or ready |
| Tasks & Deliverables | 48 records, 21 \`Em curso\`, 27 \`Backlog\` | 0 marked completed |
| Test Cases | 55 records, 19 \`Pronto\`, 36 \`Por desenhar\` | Test-case status does not imply execution |
| Executions & Evidence | 17 records, 7 \`Passou\`, 7 \`Por executar\`, 2 observational, 1 blocked | 15 distinct cases linked to a passing automated execution; **0 independently accepted evidence records** |
| Standards & Controls | 36 records, 29 \`Por avaliar\`, 6 \`Em análise\`, 1 \`Lacuna\` | 0 \`Conforme com evidência\` |
| GitHub \`main\` | \`1abf9afcfc7810daba8f1fab2bad0fc529aa8bbf\` | 36 unit and 10 Firestore Emulator tests on PR #6; current \`main\` branch reported unprotected |
| Vercel production | Most recent production deployment returned \`READY\` at SHA \`97864406322e6e9e8ab4dcefc0283195b47797f1\` | Behind inspected main; READY is not functional acceptance |
| Data safety | AES-GCM and keyed member lookup available in code, but secure write flags OFF by default | Historical personal data not migrated; no remote Firebase Rules / key custody acceptance |

Baseline excludes exhaustive row-level assessment of Sequence Diagrams, actor/profile/permission registers and Decisions & Risks: the Notion connector's SQL/rows quota was reached while reading all tables. Saved views for seven operational tables were still accessible. Do not report 100% traceability or risk closure until those omitted rows are verified.

## Readiness scoring and progress

- **Release-gate progress** = 100 × independently attested mandatory gates / 14. At baseline: **0/14 = 0%**.
- **Functional approved/verified** = verified requirements / 46: **0/46 = 0%**. This does not erase partial implementation.
- **Requirements in progress** = 15/46 = 32.6% (work started; not completion).
- **Architecture observed in code** = 4/21 = 19.0% (not accepted).
- **Test cases prepared** = 19/55 = 34.5% (not executed).
- **Evidence with a passing CI run** = 15/55 distinct test cases = 27.3%; **accepted** = 0/55.
- **Controls accepted** = 0/36.
- **Documentation structure** = 15/15 numbered pages present (100% structural, **not** content completeness).
- **End-to-end traceability**: not measurable reliably until missing tables and sign-offs are reviewed. Do not replace N/A with 0 or 100 arbitrarily.

## Ten-percent execution cycles

These are delivery work packages, **not claims that the product has reached that percentage**.

| Cycle | Product and delivery result | Gate evidence |
| --- | --- | --- |
| 0–10% | Inventory PDD 00–14, canonical tables, \`main\`, production SHA, priorities; initial audit and risk baseline | Read-only observations and dated source links |
| 10–20% | Close contradictory product scope, confirm foundation vs association duties, approve release roles; complete APIs/Integrations and Roadmap inventories | Product/ADR decisions and API inventory sign-off |
| 20–30% | Resolve identity/consent/privacy rules, secure keys, Firebase Rules, child and school scopes | Privacy, security review and negative authorization tests |
| 30–40% | Complete monetary and material donation, receipt confirmation, fund allocation, stock and distribution | Synthetic finance reconciliation and stock flows |
| 40–50% | Complete school, guardianship, student tracking, visits, uploads, evidence and image revocation | Scoped role tests, consent, retention and evidence |
| 50–60% | Complete member lifecycle/quotas/financing, secure historical data migration and reversals | Migration journal, rollback, currency and reconciliation tests |
| 60–70% | QA automation: API integration, E2E auth, responsive/a11y, public content and error cases | Versioned run links tied to requirements |
| 70–80% | Data and operational assurance: backup/restore, key rotation, monitoring, incident drills | Restore proof, playbooks, delegated operator ownership |
| 80–90% | Launch rehearsal: preview SHA, API contract checks, accessibility/content/legal approval, training | Human reviewed acceptance and release candidate |
| 90–100% | Controlled release of same SHA, smoke production, support handover, rollback and formal GO | Accepted evidence and recorded human decision |

## Cross-domain priority and red flags

1. Scope: original PDD framed an institutional website; 2026-10-25 requirements include membership, dues, donations, schools and minors. Expanded scope was user-requested, but decision authority, boundaries and acceptance still need formal Notion governance. Do not infer mandatory association dues for a foundation.
2. Privacy: both real Firestore/Storage rules and encrypted data rollout need independent verification; Firestore Emulator rules are intentionally deny-all and do not establish remote production security.
3. Funding: a funding award is not cash in treasury. Monetary donor/expense flows, earmarked funds, refunds, statements and account balances require reconciliation and approval paths.
4. Security: \`main\` is currently not protected by GitHub branch protection, according to GitHub API; require reviews/checks and disallow bypass before production release. Available connector actions may not permit changing repository settings.
5. Release: production deployment SHA differs from main. Do not update a live environment merely because a PR is merged.
6. Governance: no task may be called complete without verified requirement, implementation, test result, evidence and accepted deliverable.

## Traceability policy

Every approved Requirement → Architecture/Sequence or API contract → Task → Git commit/PR → Test Case → real Execution → accepted Evidence → Deliverable/Release. References use **existing Notion page URLs and GitHub SHAs**; adding a URL does not itself prove satisfaction. New pages should be stored in the local project tables; supplementary catalogs cannot replace the eight canonical databases or the fixed sections 00–14.

## Manual authorization required for production

Confirm in Notion a named release decision owner; approve current statutory/financial scope, storage regions and minors' data handling; appoint security/privacy reviewers; evaluate current Firebase rules and secrets; protect the main branch; execute preview and restore drills; then review the exact SHA's release evidence. Publishing, rotating live keys or migrating real personal data are separate authorizations.
