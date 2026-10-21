import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para rever pedidos." }, { status: 403 })
  try {
    const { id } = await context.params
    const { estado } = await request.json()
    if (estado !== "aceite" && estado !== "rejeitado") return NextResponse.json({ error: "Estado de revisão inválido." }, { status: 400 })
    const db = getFirebaseAdminFirestore()
    const intentionRef = db.collection("area_membership_intentions").doc(id)
    const intentionSnapshot = await intentionRef.get()
    if (!intentionSnapshot.exists) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
    if (intentionSnapshot.get("estado") !== "pendente") return NextResponse.json({ error: "Este pedido já foi revisto." }, { status: 409 })

    const intention = intentionSnapshot.data()!
    const now = new Date().toISOString()
    if (estado === "rejeitado") {
      await intentionRef.update({ estado, revistoEm: now, revistoPor: admin.uid })
      return NextResponse.json({ ok: true })
    }

    const email = String(intention.email || "").trim().toLowerCase()
    if (!email) return NextResponse.json({ error: "O pedido não tem um email válido." }, { status: 400 })
    const socioId = createHash("sha256").update(email).digest("hex")
    const socioRef = db.collection("area_socios").doc(socioId)
    await db.runTransaction(async (transaction) => {
      const [currentIntent, currentSocio] = await Promise.all([transaction.get(intentionRef), transaction.get(socioRef)])
      if (!currentIntent.exists || currentIntent.get("estado") !== "pendente") throw new Error("INTENTION_REVIEWED")
      if (currentSocio.exists) throw new Error("SOCIO_EXISTS")
      transaction.create(socioRef, {
        nome: String(intention.nome || ""),
        email,
        telefone: String(intention.telefone || ""),
        numeroSocio: "",
        observacoes: String(intention.mensagem || ""),
        dataAdesao: now.slice(0, 10),
        estado: "ativo",
        createdBy: admin.uid,
        createdAt: now,
        origem: "pedido_home",
        pedidoAdesaoId: id,
      })
      transaction.update(intentionRef, { estado, revistoEm: now, revistoPor: admin.uid, socioId })
    })
    return NextResponse.json({ ok: true, socioId })
  } catch (error) {
    const code = error instanceof Error ? error.message : ""
    if (code === "INTENTION_REVIEWED") return NextResponse.json({ error: "Este pedido já foi revisto." }, { status: 409 })
    if (code === "SOCIO_EXISTS") return NextResponse.json({ error: "Já existe um sócio com este email; o pedido não foi convertido." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 })
  }
}
