import { createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAccess, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
const collectionName = "area_socios"
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const access = await requireAreaAccess(request)
  if (!access) return NextResponse.json({ error: "Esta conta não tem acesso à área de sócios." }, { status: 403 })
  try {
    const collection = getFirebaseAdminFirestore().collection(collectionName)
    if (access.role === "socio") {
      const socio = await collection.doc(access.socioId).get()
      const data = socio.data()
      return NextResponse.json({ socios: socio.exists && data ? [{ id: socio.id, nome: data.nome, email: data.email, telefone: data.telefone, numeroSocio: data.numeroSocio, observacoes: data.observacoes, dataAdesao: data.dataAdesao, estado: data.estado }] : [] })
    }
    const snapshot = await collection.orderBy("nome").limit(1000).get()
    return NextResponse.json({ socios: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os sócios." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir sócios." }, { status: 403 })
  try {
    const body = await request.json()
    const nome = clean(body.nome, 120)
    const email = clean(body.email, 254).toLowerCase()
    const telefone = clean(body.telefone, 40)
    const numeroSocio = clean(body.numeroSocio, 40)
    const observacoes = clean(body.observacoes, 1000)
    const dataAdesao = clean(body.dataAdesao, 10)
    if (nome.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || !/^\d{4}-\d{2}-\d{2}$/.test(dataAdesao)) {
      return NextResponse.json({ error: "Preenche um nome, email e data de adesão válidos." }, { status: 400 })
    }
    const db = getFirebaseAdminFirestore()
    const id = createHash("sha256").update(email).digest("hex")
    const ref = db.collection(collectionName).doc(id)
    const prior = await ref.get()
    if (prior.exists) return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
    const socio = { nome, email, telefone, numeroSocio, observacoes, dataAdesao, estado: "ativo", createdBy: admin.uid, createdAt: new Date().toISOString() }
    await ref.create(socio)
    return NextResponse.json({ socio: { id, ...socio } }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string | number })?.code === 6 || (error as { code?: string | number })?.code === "already-exists") {
      return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
    }
    return NextResponse.json({ error: "Não foi possível criar o registo do sócio." }, { status: 500 })
  }
}
