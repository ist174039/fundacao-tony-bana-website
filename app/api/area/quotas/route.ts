import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAccess, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { normalizeStoredXofAmount } from "@/lib/area-currency"

export const runtime = "nodejs"
const obligationsCollection = "area_quota_obligations"
const receiptsCollection = "area_financial_transactions"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const access = await requireAreaAccess(request)
  if (!access) return NextResponse.json({ error: "Esta conta não tem acesso às quotas." }, { status: 403 })
  try {
    const db = getFirebaseAdminFirestore()
    const obligationQuery = db.collection(obligationsCollection)
    const receiptQuery = db.collection(receiptsCollection).where("tipo", "==", "quota")
    const [obligations, receipts] = await Promise.all([
      (access.role === "socio" ? obligationQuery.where("socioId", "==", access.socioId) : obligationQuery.orderBy("periodo", "desc").limit(1000)).get(),
      (access.role === "socio" ? receiptQuery.where("socioId", "==", access.socioId) : receiptQuery.limit(5000)).get(),
    ])
    const paidByObligation = new Map<string, number>()
    receipts.docs.forEach((doc) => {
      const data = doc.data()
      const id = data.obligationId as string | undefined
      if (id) paidByObligation.set(id, (paidByObligation.get(id) || 0) + normalizeStoredXofAmount(data.valorMinor, data.moeda))
    })
    const quotaRows: Array<Record<string, unknown>> = obligations.docs.map((doc) => {
        const data = doc.data()
        const pagoMinor = paidByObligation.get(doc.id) || 0
        const { createdBy, ...visibleData } = data
        const valorMinor = normalizeStoredXofAmount(data.valorMinor, data.moeda)
        return { id: doc.id, ...visibleData, valorMinor, moeda: "XOF", ...(access.role === "admin" ? { createdBy } : {}), pagoMinor, emDividaMinor: Math.max(0, valorMinor - pagoMinor), estado: pagoMinor >= valorMinor ? "paga" : pagoMinor > 0 ? "parcial" : "pendente" }
      })
    return NextResponse.json({ quotas: quotaRows.sort((a, b) => String(b.periodo).localeCompare(String(a.periodo))) })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar as quotas." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para criar quotas." }, { status: 403 })
  try {
    const body = await request.json()
    const socioId = typeof body.socioId === "string" ? body.socioId : ""
    const periodo = typeof body.periodo === "string" ? body.periodo : ""
    const vencimento = typeof body.vencimento === "string" ? body.vencimento : ""
    const valorInput = Number(body.valor)
    const valorMinor = Math.round(valorInput)
    if (!socioId || !/^\d{4}-\d{2}$/.test(periodo) || !/^\d{4}-\d{2}-\d{2}$/.test(vencimento) || !Number.isSafeInteger(valorInput) || valorMinor < 1) {
      return NextResponse.json({ error: "Indica sócio, período, vencimento e valor válidos." }, { status: 400 })
    }
    const db = getFirebaseAdminFirestore()
    const socioRef = db.collection("area_socios").doc(socioId)
    const socio = await socioRef.get()
    if (!socio.exists) return NextResponse.json({ error: "Sócio não encontrado." }, { status: 404 })
    const obligationId = `${socioId}_${periodo}`
    const ref = db.collection(obligationsCollection).doc(obligationId)
    const prior = await ref.get()
    if (prior.exists) return NextResponse.json({ error: "Já existe uma quota para este sócio neste período." }, { status: 409 })
    if (socio.get("estado") !== "ativo") return NextResponse.json({ error: "Só é possível criar quotas para sócios ativos." }, { status: 400 })
    await ref.create({ socioId, socioNome: socio.get("nome"), periodo, vencimento, valorMinor, moeda: "XOF", createdBy: admin.uid, createdAt: new Date().toISOString() })
    return NextResponse.json({ success: true, id: obligationId }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string | number })?.code === 6 || (error as { code?: string | number })?.code === "already-exists") {
      return NextResponse.json({ error: "Já existe uma quota para este sócio neste período." }, { status: 409 })
    }
    return NextResponse.json({ error: "Não foi possível criar a quota." }, { status: 500 })
  }
}
