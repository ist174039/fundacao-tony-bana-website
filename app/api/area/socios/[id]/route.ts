import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function PATCH(request: Request, context: { params: { id: string } }) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir sócios." }, { status: 403 })
  try {
    const body = await request.json()
    const updates = {
      nome: clean(body.nome, 120),
      telefone: clean(body.telefone, 40),
      numeroSocio: clean(body.numeroSocio, 40),
      observacoes: clean(body.observacoes, 1000),
      estado: body.estado === "inativo" ? "inativo" : "ativo",
      updatedBy: admin.uid,
      updatedAt: new Date().toISOString(),
    }
    if (updates.nome.length < 2) return NextResponse.json({ error: "O nome deve ter pelo menos dois caracteres." }, { status: 400 })
    const ref = getFirebaseAdminFirestore().collection("area_socios").doc(context.params.id)
    if (!(await ref.get()).exists) return NextResponse.json({ error: "Sócio não encontrado." }, { status: 404 })
    await ref.update(updates)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o sócio." }, { status: 500 })
  }
}
