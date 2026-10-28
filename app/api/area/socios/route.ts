import {operationalActor} from '@/lib/server/operational-authorization'
import { auditedCreate } from '@/lib/server/audit-log.mjs'
import { createHash } from "node:crypto"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { createSecureMember, openMember, isMemberIndexConfigured } from "@/lib/server/member-registry.mjs"
import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAccess, requireAreaAdmin } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"
const collectionName = "area_socios"
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const access = await requireAreaAccess(request)
  if (!access) return NextResponse.json({ error: "Esta conta não tem acesso à área de sócios." }, { status: 403 })
  if(access.role==='operational'&&!(await operationalActor(request,'finance','read')))return NextResponse.json({error:'Sem autorização financeira.'},{status:403})
  try {
    const collection = getFirebaseAdminFirestore().collection(collectionName)
    if (access.role === "socio") {
      const socio = await collection.doc(access.socioId).get()
      const data = socio.data()
      const visible = socio.exists && data ? openMember(data, socio.ref.path) : null
      return NextResponse.json({ socios: visible ? [{ id: socio.id, nome: visible.nome, email: visible.email, telefone: visible.telefone, numeroSocio: visible.numeroSocio, observacoes: visible.observacoes, dataAdesao: visible.dataAdesao, estado: visible.estado }] : [] })
    }
    // Encrypted member names cannot be used in Firestore orderBy queries.
    const snapshot = await collection.limit(1000).get()
    const rows = snapshot.docs.map((doc) => ({ id: doc.id, ...openMember(doc.data(), doc.ref.path) }))
    rows.sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt"))
    return NextResponse.json({ socios: access.role==='operational'?rows.map(({id,nome,numeroSocio,estado})=>({id,nome,numeroSocio,estado})):rows })
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"
    console.error("[area-socios] Firestore read failed", { code })
    return NextResponse.json({ error: "Não foi possível carregar os sócios.", code }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir sócios." }, { status: 403 })
  const secureMembers = process.env.FTB_SECURE_MEMBER_REGISTRY === "true"
  if (secureMembers && (!isFieldEncryptionConfigured() || !isMemberIndexConfigured()))
    return NextResponse.json({ error: "O registo seguro de sócios não está configurado." }, { status: 503 })
  if (secureMembers && process.env.FTB_ENCRYPT_FINANCIAL_PII !== "true")
    return NextResponse.json({ error: "O registo seguro exige a cifragem financeira ativa." }, { status: 503 })
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
    if (secureMembers) {
      const data = { nome, email, telefone, numeroSocio, observacoes, dataAdesao }
      const result = await createSecureMember(db, data, admin.uid)
      if (result.status !== "created")
        return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
      return NextResponse.json({ socio: { id: result.id, ...result.member } }, { status: 201 })
    }
    const id = createHash("sha256").update(email).digest("hex")
    const ref = db.collection(collectionName).doc(id)
    const prior = await ref.get()
    if (prior.exists) return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
    const socio = { nome, email, telefone, numeroSocio, observacoes, dataAdesao, estado: "ativo", createdBy: admin.uid, createdAt: new Date().toISOString() }
    await auditedCreate(ref,socio,{module:'socios',actorUid:admin.uid})
    return NextResponse.json({ socio: { id, ...socio } }, { status: 201 })
  } catch (error) {
    if ((error as { code?: string | number })?.code === 6 || (error as { code?: string | number })?.code === "already-exists") {
      return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
    }
    return NextResponse.json({ error: "Não foi possível criar o registo do sócio." }, { status: 500 })
  }
}
