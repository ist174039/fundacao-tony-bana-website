import { appendAuditEvent } from './audit-log.mjs'
/**
 * Review public membership intentions without downgrading encrypted identity.
 * All checks and persistence happen inside a single Firestore transaction.
 */
import { openMembershipIntention } from "./membership-privacy.mjs"
import { sealMember, legacyMemberDocumentId } from "./member-registry.mjs"
import { memberEmailBlindIndex, newMemberDocumentId } from "./membership-privacy.mjs"

export class IntentionReviewError extends Error {
  constructor(code) { super(code); this.name = "IntentionReviewError"; this.code = code }
}

export async function reviewMembershipIntention(db, id, requestedState, actorUid, { secureMembers = false } = {}) {
  if (!/^[a-zA-Z0-9_-]{4,90}$/.test(id)) throw new IntentionReviewError("INVALID_ID")
  if (!["aceite", "rejeitado", "respondido"].includes(requestedState))
    throw new IntentionReviewError("INVALID_STATE")
  const ref = db.collection("area_membership_intentions").doc(id)
  // Stable across callback retries (Firestore may re-execute transactions).
  const memberId = secureMembers ? newMemberDocumentId() : null
  return db.runTransaction(async tx => {
    const snapshot = await tx.get(ref)
    if (!snapshot.exists) return { status: "not-found" }
    if (snapshot.get("estado") !== "pendente") return { status: "reviewed" }

    const raw = snapshot.data()
    const tipo = raw.tipo || "adesao"
    if (requestedState === "respondido") {
      if (tipo !== "duvida") return { status: "invalid-transition" }
      const updated={estado:"respondido",revistoPor:actorUid,revistoEm:new Date().toISOString()}
      tx.update(ref,updated)
      appendAuditEvent(tx,db,{module:'membership-intentions',action:'review',recordPath:ref.path,actorUid,before:raw,after:{...raw,...updated}})
      return { status: "reviewed-ok" }
    }
    if (requestedState === "rejeitado") {
      const updated={estado:"rejeitado",revistoPor:actorUid,revistoEm:new Date().toISOString()}
      tx.update(ref,updated)
      appendAuditEvent(tx,db,{module:'membership-intentions',action:'review',recordPath:ref.path,actorUid,before:raw,after:{...raw,...updated}})
      return { status: "reviewed-ok" }
    }
    if (tipo !== "adesao") return { status: "invalid-transition" }
    const wasEncrypted = Boolean(raw.dadosPrivados)
    if (wasEncrypted && !secureMembers) return { status: "secure-mode-required" }

    const intention = openMembershipIntention(raw, ref.path, { allowLegacy: true })
    const email = typeof intention.email === "string" ? intention.email.trim().toLowerCase() : ""
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return { status: "invalid-email" }
    if (typeof intention.nome !== "string" || intention.nome.trim().length < 2)
      return { status: "invalid-name" }

    const legacyRef = db.collection("area_socios").doc(legacyMemberDocumentId(email))
    const indexRef = secureMembers
      ? db.collection("area_member_email_index").doc(memberEmailBlindIndex(email))
      : null
    const newRef = secureMembers ? db.collection("area_socios").doc(memberId) : legacyRef

    // Firestore requires reads before writes. A concurrent approval or
    // duplicate registration triggers transaction retry, not double creation.
    const old = await tx.get(legacyRef)
    const indexed = indexRef ? await tx.get(indexRef) : null
    if (old.exists || indexed?.exists) return { status: "already-member" }

    const now = new Date().toISOString()
    const payload = {
      nome: intention.nome.trim(),
      email,
      telefone: typeof intention.telefone === "string" ? intention.telefone : "",
      numeroSocio: "",
      observacoes: typeof intention.mensagem === "string" ? intention.mensagem : "",
      dataAdesao: now.slice(0, 10),
      estado: "ativo",
      createdBy: actorUid,
      createdAt: now,
      origem: "pedido_home",
      pedidoAdesaoId: id,
    }
    if (secureMembers) {
      const sealed=sealMember(payload,newRef.path)
      tx.create(newRef,sealed)
      appendAuditEvent(tx,db,{module:'socios',action:'create',recordPath:newRef.path,actorUid,after:sealed,at:now})
      const indexData={socioId:memberId,createdAt:now,schema:1}
      tx.create(indexRef,indexData)
      appendAuditEvent(tx,db,{module:'member-index',action:'create',recordPath:indexRef.path,actorUid,after:indexData,at:now})
    } else {
      tx.create(newRef,payload)
      appendAuditEvent(tx,db,{module:'socios',action:'create',recordPath:newRef.path,actorUid,after:payload,at:now})
    }
    const reviewed={estado:"aceite",revistoPor:actorUid,revistoEm:now,socioId:newRef.id}
    tx.update(ref,reviewed)
    appendAuditEvent(tx,db,{module:'membership-intentions',action:'review',recordPath:ref.path,actorUid,before:raw,after:{...raw,...reviewed},at:now})
    return { status: "accepted", socioId: newRef.id }
  })
}
