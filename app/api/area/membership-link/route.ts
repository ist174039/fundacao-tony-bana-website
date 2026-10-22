import { NextResponse } from "next/server"
import { createHash } from "node:crypto"
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isConfiguredAreaAdmin, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Inicia sessão para associar a tua conta." }, { status: 401 })

  try {
    const identity = await getFirebaseAdminAuth().verifyIdToken(token)
    if (!identity.email || !identity.email_verified) return NextResponse.json({ error: "Confirma o email da tua conta antes de pedir a associação." }, { status: 403 })
    if (isConfiguredAreaAdmin(identity)) return NextResponse.json({ error: "Uma conta administradora não pode ser associada como conta de sócio." }, { status: 403 })

    const email = identity.email.trim().toLowerCase()
    const db = getFirebaseAdminFirestore()
    const socioRef = db.collection("area_socios").doc(createHash("sha256").update(email).digest("hex"))
    const result = await db.runTransaction(async (transaction) => {
      const socio = await transaction.get(socioRef)
      const ownLink = await transaction.get(db.collection("area_socios").where("uid", "==", identity.uid).limit(1))
      if (!socio.exists || socio.get("estado") !== "ativo" || String(socio.get("email") || "").trim().toLowerCase() !== email) return "not_found"
      if (ownLink.docs.some((doc) => doc.id !== socioRef.id)) return "other_link"
      if (socio.get("uid") === identity.uid) return "already_linked"
      if (socio.get("uid")) return "linked_elsewhere"
      transaction.update(socioRef, { uid: identity.uid, accountLinkedAt: new Date().toISOString(), accountLinkedBy: "self" })
      return "linked"
    })

    if (result === "not_found") return NextResponse.json({ error: "Não encontrámos um registo de sócio ativo com o email desta conta. Confirma que usaste o mesmo email indicado à Fundação." }, { status: 404 })
    if (result === "other_link") return NextResponse.json({ error: "Esta conta já está associada a outro registo de sócio. Contacta a Fundação para corrigir a associação." }, { status: 409 })
    if (result === "linked_elsewhere") return NextResponse.json({ error: "Este registo de sócio já está associado a outra conta. Contacta a Fundação para pedir ajuda." }, { status: 409 })
    return NextResponse.json({ success: true, alreadyLinked: result === "already_linked" })
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"
    if (code.startsWith("auth/")) return NextResponse.json({ error: "A sessão expirou. Entra novamente e tenta outra vez." }, { status: 401 })
    console.error("[area-membership-link] Association failed", { code })
    return NextResponse.json({ error: "Não foi possível associar a conta agora. Tenta novamente mais tarde." }, { status: 500 })
  }
}
