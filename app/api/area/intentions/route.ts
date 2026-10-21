import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  if (!await requireAreaAdmin(request)) return NextResponse.json({ error: "Sem autorização para consultar pedidos." }, { status: 403 })
  try {
    const snapshot = await getFirebaseAdminFirestore().collection("area_membership_intentions").orderBy("criadoEm", "desc").limit(500).get()
    return NextResponse.json({ intentions: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os pedidos de adesão." }, { status: 500 })
  }
}
