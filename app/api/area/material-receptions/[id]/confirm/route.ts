import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { openMaterialReception, sealStockItem } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"

/**
 * Confirmation is a single Firestore transaction. It creates immutable
 * stock lots and incoming stock movements exactly once per reception.
 * Pending declarations have NO effect on available stock.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (process.env.FTB_MATERIAL_DONATIONS_ENABLED !== "true")
    return NextResponse.json({ error: "Módulo indisponível." }, { status: 503 })
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured())
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para confirmar receções." }, { status: 403 })
  const id = params.id
  if (!/^[a-zA-Z0-9]{12,40}$/.test(id))
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 })
  const db = getFirebaseAdminFirestore()
  const ref = db.collection("area_material_receptions").doc(id)
  try {
    const completed = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref)
      if (!snapshot.exists) return "not-found" as const
      const record = openMaterialReception(snapshot.data()!, ref.path)
      if (record.estado === "confirmada") return "already-confirmed" as const
      if (record.estado !== "pendente") return "invalid-state" as const
      const itens: Array<{
        categoria: string; descricao: string; quantidade: number;
        unidade: string; estado: string
      }> = record.itens
      if (!Array.isArray(itens) || itens.length === 0 || itens.length > 50)
        return "invalid-state" as const
      const now = new Date().toISOString()
      for (let i = 0; i < itens.length; i++) {
        const linha = itens[i]
        const lot = db.collection("area_material_stock_lots").doc(ref.id + "-" + i)
        const movement = db.collection("area_material_stock_movements").doc(ref.id + "-entrada-" + i)
        transaction.create(lot, {
          ...sealStockItem(linha, lot.path),
          rececaoId: ref.id, linha: i,
          atualizadoEm: now,
        })
        transaction.create(movement, {
          tipo: "entrada", rececaoId: ref.id, loteId: lot.id,
          quantidade: linha.quantidade, unidade: linha.unidade,
          criadoEm: now, criadoPor: admin.uid,
        })
      }
      transaction.update(ref, { estado: "confirmada", confirmadoEm: now, confirmadoPor: admin.uid })
      return "confirmed" as const
    })
    if (completed === "not-found") return NextResponse.json({ error: "Receção não encontrada." }, { status: 404 })
    if (completed === "invalid-state") return NextResponse.json({ error: "Estado inválido para confirmação." }, { status: 409 })
    return NextResponse.json({
      estado: "confirmada",
      novaConfirmacao: completed === "confirmed",
      id,
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar a entrada em stock." }, { status: 500 })
  }
}