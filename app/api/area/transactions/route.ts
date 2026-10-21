import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAccess, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
const collectionName = "area_financial_transactions"
const methods = new Set(["dinheiro", "transferencia", "multicaixa", "outro"])

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const access = await requireAreaAccess(request)
  if (!access) return NextResponse.json({ error: "Esta conta não tem acesso aos recebimentos." }, { status: 403 })
  try {
    const collection = getFirebaseAdminFirestore().collection(collectionName)
    const snapshot = access.role === "socio"
      ? await collection.where("socioId", "==", access.socioId).limit(2000).get()
      : await collection.orderBy("data", "desc").limit(2000).get()
    const transactions: Array<Record<string, unknown>> = snapshot.docs.map((doc) => {
      const data = doc.data()
      const { createdBy, ...visibleData } = data
      return { id: doc.id, ...visibleData, ...(access.role === "admin" ? { createdBy } : {}) }
    }).sort((a, b) => String((b as Record<string, unknown>).data).localeCompare(String((a as Record<string, unknown>).data)))
    return NextResponse.json({ transactions })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os recebimentos." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para registar recebimentos." }, { status: 403 })

  try {
    const body = await request.json()
    const tipo = body.tipo === "quota" ? "quota" : body.tipo === "doacao" ? "doacao" : ""
    const valorMinor = Math.round(Number(body.valor) * 100)
    const data = typeof body.data === "string" ? body.data : ""
    const metodo = typeof body.metodo === "string" ? body.metodo : ""
    const notas = typeof body.notas === "string" ? body.notas.trim().slice(0, 1000) : ""
    if (!tipo || !Number.isSafeInteger(valorMinor) || valorMinor < 1 || !/^\d{4}-\d{2}-\d{2}$/.test(data) || !methods.has(metodo)) {
      return NextResponse.json({ error: "Indica tipo, valor, data e método de pagamento válidos." }, { status: 400 })
    }

    const db = getFirebaseAdminFirestore()
    const ref = db.collection(collectionName).doc()
    const transaction = {
      tipo,
      valorMinor,
      moeda: "AOA",
      data,
      metodo,
      notas,
      createdBy: admin.uid,
      createdAt: new Date().toISOString(),
    } as Record<string, unknown>

    if (tipo === "doacao") {
      const anonymous = body.anonymous === true
      const doador = typeof body.doador === "string" ? body.doador.trim().slice(0, 120) : ""
      if (!anonymous && !doador) return NextResponse.json({ error: "Indica o doador ou marca a doação como anónima." }, { status: 400 })
      transaction.anonymous = anonymous
      transaction.doador = anonymous ? "" : doador
      if (typeof body.socioId === "string" && body.socioId) transaction.socioId = body.socioId
    } else {
      const obligationId = typeof body.obligationId === "string" ? body.obligationId : ""
      if (!obligationId) return NextResponse.json({ error: "Seleciona a quota a que este pagamento será associado." }, { status: 400 })
      await db.runTransaction(async (firestoreTransaction) => {
        const obligationRef = db.collection("area_quota_obligations").doc(obligationId)
        const obligation = await firestoreTransaction.get(obligationRef)
        if (!obligation.exists) throw new Error("QUOTA_NOT_FOUND")
        const receipts = await firestoreTransaction.get(db.collection(collectionName).where("obligationId", "==", obligationId))
        const alreadyPaid = receipts.docs.reduce((total, receipt) => total + Number(receipt.get("valorMinor") || 0), 0)
        const amount = Number(obligation.get("valorMinor") || 0)
        if (alreadyPaid + valorMinor > amount) throw new Error("PAYMENT_EXCEEDS_BALANCE")
        transaction.obligationId = obligationId
        transaction.socioId = obligation.get("socioId")
        transaction.socioNome = obligation.get("socioNome")
        transaction.periodo = obligation.get("periodo")
        firestoreTransaction.create(ref, transaction)
      })
      return NextResponse.json({ success: true, id: ref.id }, { status: 201 })
    }

    await ref.create(transaction)
    return NextResponse.json({ success: true, id: ref.id }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "QUOTA_NOT_FOUND") return NextResponse.json({ error: "Quota não encontrada." }, { status: 404 })
    if (error instanceof Error && error.message === "PAYMENT_EXCEEDS_BALANCE") return NextResponse.json({ error: "O valor excede o saldo em dívida desta quota." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível registar o recebimento." }, { status: 500 })
  }
}
