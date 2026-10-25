/**
 * Deliberately restricted migration runner for synthetic Firestore Emulator data.
 * Does not run against production and never returns any private field values.
 */
import { classifyMembershipIntention, sealMembershipIntention } from "./membership-privacy.mjs"

export function assertDemoFirestore() {
  if (!["127.0.0.1:8080", "localhost:8080"].includes(process.env.FIRESTORE_EMULATOR_HOST) ||
      !/^demo-[a-z0-9-]+$/.test(process.env.GCLOUD_PROJECT || ""))
    throw new Error("Migration requires a local Firestore Emulator demo-* project")
}

export async function migrateMembershipIntentionInEmulator(db, FieldValue, documentId, { apply = false } = {}) {
  assertDemoFirestore()
  if (!/^[a-zA-Z0-9_-]{4,90}$/.test(documentId)) throw new Error("Invalid fixture document ID")
  const ref = db.collection("area_membership_intentions").doc(documentId)
  if (!apply) {
    const snap = await ref.get()
    if (!snap.exists) return "missing"
    return classifyMembershipIntention(snap.data())
  }
  // Read and write atomically; retry after transient failures is idempotent.
  return db.runTransaction(async trx => {
    const snapshot = await trx.get(ref)
    if (!snapshot.exists) return "missing"
    const raw = snapshot.data()
    const classification = classifyMembershipIntention(raw)
    if (classification !== "legacy") return classification
    const sealed = sealMembershipIntention(raw, ref.path)
    trx.update(ref, {
      ...sealed,
      nome: FieldValue.delete(),
      email: FieldValue.delete(),
      telefone: FieldValue.delete(),
      mensagem: FieldValue.delete(),
    })
    return "migrated"
  })
}
