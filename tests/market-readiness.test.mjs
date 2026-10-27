import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { assessRelease, readArgs, REQUIRED_GATES } from "../scripts/market-readiness.mjs"

const baseline = JSON.parse(readFileSync("release/market-readiness.json", "utf8"))
const sha = "a".repeat(40)
const otherSha = "b".repeat(40)
const evidence = "https://github.com/ist174039/fundacao-tony-bana-website/actions/runs/1"

function attested() {
  return {
    ...baseline,
    gates: baseline.gates.map(g => ({
      ...g, status: "passed", verified_by: "Human Release Reviewer",
      evidence_urls: [evidence], candidate_sha: sha, environment: "production",
    })),
  }
}

test("the real market-readiness baseline is NO_GO and has complete mandatory IDs", () => {
  const result = assessRelease(baseline)
  assert.equal(result.status, "NO_GO")
  assert.equal(result.progress, 0)
  assert.equal(result.blockers.length, REQUIRED_GATES.length)
  assert.equal(result.counts.total, 14)
  assert.equal(new Set(baseline.gates.map(x => x.id)).size, 14)
})

test("a passed status without independently reviewable evidence remains blocked", () => {
  const m = attested()
  m.gates[0].verified_by = ""
  m.gates[1].evidence_urls = []
  m.gates[2].candidate_sha = otherSha
  m.gates[3].environment = "preview"
  const result = assessRelease(m, { candidateSha: sha, productionSha: sha })
  assert.equal(result.status, "NO_GO")
  for (const id of ["G01", "G02", "G03", "G04"])
    assert.ok(result.blockers.includes(id))
})

test("the release blocks production SHA drift even when attestation is otherwise complete", () => {
  const result = assessRelease(attested(), { candidateSha: sha, productionSha: otherSha })
  assert.equal(result.status, "NO_GO")
  assert.ok(result.blockers.includes("G11"))
})

test("missing or duplicated mandatory gates fail closed", () => {
  const m = attested()
  m.gates[0] = { ...m.gates[1] }
  const result = assessRelease(m, { candidateSha: sha, productionSha: sha })
  assert.equal(result.status, "NO_GO")
  assert.ok(result.errors.some(x => x.includes("Duplicate gate")))
  assert.ok(result.errors.some(x => x.includes("Missing required gate")))
})

test("all independently attested gates are eligible for human GO decision only", () => {
  const result = assessRelease(attested(), { candidateSha: sha, productionSha: sha })
  assert.equal(result.status, "GO_ELIGIBLE_PENDING_HUMAN_DECISION")
  assert.equal(result.progress, 100)
  assert.deepEqual(result.blockers, [])
  // The program does NOT deploy, flip secrets, or assert a human decision happened.
})

test("enforced readiness CLI requires both explicit 40-character SHAs", () => {
  assert.throws(() => readArgs(["--enforce"]), /requires explicit/)
  assert.throws(() => readArgs(["--enforce", "--sha", sha]), /requires explicit/)
  assert.throws(() => readArgs(["--enforce", "--production-sha", sha]), /requires explicit/)
  assert.throws(() => readArgs(["--enforce", "--sha", sha, "--production-sha"]), /requires explicit/)
  assert.throws(() => readArgs(["--enforce", "--sha", "invalid", "--production-sha", sha]), /requires explicit/)
  assert.deepEqual(
    [readArgs(["--enforce", "--sha", sha, "--production-sha", otherSha]).candidateSha,
      readArgs(["--enforce", "--sha", sha, "--production-sha", otherSha]).productionSha],
    [sha, otherSha],
  )
})

test("report-only CLI stays diagnostic even without explicit release SHAs", () => {
  const args = readArgs(["--report-only"])
  assert.equal(args.enforce, false)
  assert.equal(args.productionSha, "")
})
