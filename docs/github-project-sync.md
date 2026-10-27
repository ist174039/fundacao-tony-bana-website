# Fundação Tony Bana — GitHub Project reconciliation

**Origin:** Notion PDD/Requirements/Test Cases → GitHub Issues `[REQ] FTB-*`, `[TEST] FTB-TC-*` → personal GitHub Project #2. After the one-off migration, **GitHub Issues/Projects are operational; Notion remains institutional documentation**. This is deliberately **not** bidirectional Notion sync.

## Prerequisites (human GitHub admin)

1. Correct GitHub branch ruleset `chatgpt`: currently includes `~ALL` and `~DEFAULT_BRANCH`, disallowing creation of *feature branches* with the active app identity (`422 Reference update failed`). Restrict the PR/required-check ruleset to `~DEFAULT_BRANCH` so that feature branches can be created. Keep the requirement for reviews and CI on `main`. Verify on a nondefault branch before continuing. Do not disable protection of `main`.
2. In repository **Settings → Secrets and variables → Actions**, add `FTB_GH_PROJECTS_TOKEN`. Use a GitHub PAT (classic `project`, `repo` scope as needed for this private/project context) or suitable fine-grained credential that can read/write **user Project #2** and read repository Issues; restrict its ownership, expiry, and access, and rotate it. **Never paste credentials into Notion/Issues/workflow files.** Do not mistake built-in `GITHUB_TOKEN` for personal Projects write permission.
3. Review and merge the draft PR for this workflow after tests. No production deploy is needed.
4. Go to repository **Actions → Fundação Tony Bana — GitHub Project reconciliation → Run workflow**. First run `apply=false` to inspect the dry-run inventory. Run `apply=true` to add only missing Issues. Subsequently, issue events and a daily reconciliation keep new Issues associated automatically.

## Safety

- The script reads paginated Project items and open Issues and only matches canonical prefixes `[REQ]` or `[TEST]`. It fails if a canonical ID is duplicated or the baseline 46/69 inventory is missing. It never closes issues, updates statuses, changes Notion, or removes Project items.
- `--dry-run` is the default. `--apply` requires explicit action or the already-approved scheduled workflow. Repeated application is idempotent; failed partial batches are safe to retry.
- Workflow skips the operation when the token is absent, recording the blocker in Job Summary; **that is not a successful synchronization**.
- Client-side Project views/filters still need configuration: Requisitos `[REQ]`, Testes `[TEST]`, Tarefas by `type:task`/labels, Releases by milestone. Statuses in Notion are documentary, not automatically verified in GitHub.
- `node --test tests/github-project-sync.test.mjs` validates classification, missing items, GraphQL error, pagination, dry-run and duplicate detection with synthetic responses.

## Traceability and acceptance

- Notion PDD: https://app.notion.com/p/3ffbe9392b6081b7bbf8dfecdd1362e8
- GitHub Project #2: https://github.com/users/ist174039/projects/2
- Repository Issues: https://github.com/ist174039/fundacao-tony-bana-website/issues
- To claim *sync complete*: a workflow report must show `requirements=46`, `tests=69`, `linkedAlready=115`, `additions=[]` with zero errors; verify Project UI has the same 115 canonical items and views. This reports structural association only, **not implementation approval**.
