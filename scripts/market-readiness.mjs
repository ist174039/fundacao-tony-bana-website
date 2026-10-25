#!/usr/bin/env node
/**
 * Non-deploying release readiness checker.
 *
 * Without --enforce this is a diagnostic: CI can continue while the project
 * is NO-GO. With --enforce, any missing/expired evidence or failed gate blocks
 * promotion. Do not use tool output as a substitute for human review.
 */
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export const REQUIRED_GATES = [
  "G01", "G02", "G03", "G04", "G05", "G06", "G07",
  "G08", "G09", "G10", "G11", "G12", "G13", "G14",
]
export const SHA_PATTERN = /^[a-f0-9]{40}$/i
export function isReviewableEvidenceUrl(value) {
  if (typeof value !== "string") return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && !!url.hostname &&
      !url.username && !url.password
  } catch {
    return false
  }
}

const VALID_STATES = new Set(["blocked", "pending", "passed"])

export function assessRelease(manifest, { candidateSha, productionSha } = {}) {
  const errors = []
  if (!manifest || typeof manifest !== "object" || !Array.isArray(manifest.gates))
    return { status: "NO_GO", progress: 0, counts: { passed: 0, total: REQUIRED_GATES.length }, errors: ["Invalid release manifest"], blockers: REQUIRED_GATES }

  const ids = new Set()
  const blockers = []
  let passed = 0
  const sha = candidateSha || manifest.baseline_main_sha
  const deployed = productionSha || manifest.observed_production_sha
  if (!SHA_PATTERN.test(sha || "")) errors.push("Candidate SHA must be a complete 40-char Git SHA")
  if (!SHA_PATTERN.test(deployed || "")) errors.push("Production SHA must be a complete 40-char Git SHA")

  for (const gate of manifest.gates) {
    if (!gate || typeof gate.id !== "string") { errors.push("Gate missing identifier"); continue }
    if (ids.has(gate.id)) errors.push("Duplicate gate ID " + gate.id)
    ids.add(gate.id)
    if (!VALID_STATES.has(gate.status)) errors.push("Invalid gate status: " + gate.id)

    if (gate.status !== "passed") { blockers.push(gate.id); continue }
    const urls = gate.evidence_urls
    const hasEvidence = Array.isArray(urls) && urls.length > 0 &&
      urls.every(isReviewableEvidenceUrl)
    const verified = typeof gate.verified_by === "string" && gate.verified_by.trim().length >= 3
    const linkedCommit = gate.candidate_sha === sha
    const productionScoped = gate.environment === "production"
    if (!hasEvidence || !verified || !linkedCommit || !productionScoped) {
      errors.push("Invalid attestation: " + gate.id)
      blockers.push(gate.id)
      continue
    }
    if (gate.id === "G11" && deployed !== sha) {
      errors.push("Production deployment SHA differs from the release candidate")
      blockers.push(gate.id)
      continue
    }
    passed++
  }
  for (const id of REQUIRED_GATES) {
    if (!ids.has(id)) { errors.push("Missing required gate: " + id); blockers.push(id) }
  }
  for (const id of ids) if (!REQUIRED_GATES.includes(id)) errors.push("Unknown gate: " + id)
  const status = blockers.length === 0 && errors.length === 0 && passed === REQUIRED_GATES.length
    ? "GO_ELIGIBLE_PENDING_HUMAN_DECISION" : "NO_GO"
  return {
    status,
    progress: Math.round(100 * passed / REQUIRED_GATES.length),
    counts: { passed, total: REQUIRED_GATES.length },
    candidateSha: sha,
    productionSha: deployed,
    blockers: [...new Set(blockers)],
    errors,
  }
}

function readArgs(args) {
  let manifest = "release/market-readiness.json"
  let candidateSha = process.env.GITHUB_SHA || ""
  let productionSha = ""
  let enforce = false
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--manifest") manifest = args[++i]
    else if (args[i] === "--sha") candidateSha = args[++i]
    else if (args[i] === "--production-sha") productionSha = args[++i]
    else if (args[i] === "--enforce") enforce = true
    else if (args[i] !== "--report-only") throw new Error("Unknown argument: " + args[i])
  }
  return { manifest, candidateSha, productionSha, enforce }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = readArgs(process.argv.slice(2))
    const data = JSON.parse(readFileSync(args.manifest, "utf8"))
    // GITHUB_SHA (pull request merge ref) need not match the last main commit.
    // An attestation is always tied to the exact release candidate SHA supplied.
    const result = assessRelease(data, {
      candidateSha: args.candidateSha || data.baseline_main_sha,
      productionSha: args.productionSha || data.observed_production_sha,
    })
    process.stdout.write(JSON.stringify(result, null, 2) + "\n")
    if (args.enforce && result.status !== "GO_ELIGIBLE_PENDING_HUMAN_DECISION")
      process.exitCode = 1
  } catch {
    // Avoid logging the manifest, environment variables or any secret.
    process.stderr.write("Release readiness manifest invalid or unreadable.\n")
    process.exitCode = 2
  }
}
