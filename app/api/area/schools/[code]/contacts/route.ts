import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { isSchoolCode, parseSchoolContactInput, SchoolValidationError } from "@/lib/server/schools-validation.mjs"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { sealContact, openContact } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"

async function checkedContext(request: Request, code: string) {
  if (process.env.FTB_SCHOOLS_ENABLED !== "true" || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return { status: 503, error: "Módulo indisponível." }
  const admin = await requireAreaAdmin(request)
  if (!admin) return { status: 403, error: "Acesso não autorizado." }
  if (!isSchoolCode(code)) return { status: 400, error: "Código de escola inválido." }
  const school = getFirebaseAdminFirestore().collection("area_schools").doc(code)
  if (!(await school.get()).exists) return { status: 404, error: "Escola não encontrada." }
  return { status: 200, admin, school }
}

export async function GET(request: Request, { params }: { params: { code: string } }) {
  const context = await checkedContext(request, params.code?.toUpperCase())
  if (!context.school) return NextResponse.json({ error: context.error }, { status: context.status })
  try {
    const rows = await context.school.collection("contactos").limit(100).get()
    return NextResponse.json({ contactos: rows.docs.map((doc) => ({ id: doc.id, ...openContact(doc.data(), doc.ref.path) })) })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os contactos." }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { code: string } }) {
  const context = await checkedContext(request, params.code?.toUpperCase())
  if (!context.school || !context.admin) return NextResponse.json({ error: context.error }, { status: context.status })
  try {
    const input = parseSchoolContactInput(await request.json())
    const now = new Date().toISOString()
    const ref = context.school.collection("contactos").doc()
    await ref.create({ ...sealContact(input, ref.path), createdBy: context.admin.uid, createdAt: now })
    return NextResponse.json({ contacto: { id: ref.id, ...input } }, { status: 201 })
  } catch (error) {
    if (error instanceof SchoolValidationError || error instanceof SyntaxError)
      return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: "Não foi possível guardar o contacto." }, { status: 500 })
  }
}
