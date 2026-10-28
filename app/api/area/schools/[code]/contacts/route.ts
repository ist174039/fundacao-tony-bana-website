import { operationalActor } from '@/lib/server/operational-authorization'
import { auditedCreate } from '@/lib/server/audit-log.mjs'
import { NextResponse } from "next/server"
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { isSchoolCode, parseSchoolContactInput, SchoolValidationError } from "@/lib/server/schools-validation.mjs"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { sealContact, openContact } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"

async function checkedContext(request: Request, code: string, action:'read'|'create') {
  if (process.env.FTB_SCHOOLS_ENABLED !== "true" || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return { status: 503, error: "Módulo indisponível." }
  const admin = await operationalActor(request,'schools',action,code)
  if (!admin) return { status: 403, error: "Acesso não autorizado." }
  if (!isSchoolCode(code)) return { status: 400, error: "Código de escola inválido." }
  const school = getFirebaseAdminFirestore().collection("area_schools").doc(code)
  if (!(await school.get()).exists) return { status: 404, error: "Escola não encontrada." }
  return { status: 200, admin, school }
}

export async function GET(request: Request, { params }: { params: { code: string } }) {
  if (!(await isOperationalModuleEnabled('schools'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  const context = await checkedContext(request, params.code?.toUpperCase(), 'read')
  if (!context.school) return NextResponse.json({ error: context.error }, { status: context.status })
  try {
    const rows = await context.school.collection("contactos").limit(100).get()
    return NextResponse.json({ contactos: rows.docs.map((doc) => ({ id: doc.id, ...openContact(doc.data(), doc.ref.path) })) })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar os contactos." }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { code: string } }) {
  if (!(await isOperationalModuleEnabled('schools'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  const context = await checkedContext(request, params.code?.toUpperCase(), 'create')
  if (!context.school || !context.admin) return NextResponse.json({ error: context.error }, { status: context.status })
  try {
    const input = parseSchoolContactInput(await request.json())
    const now = new Date().toISOString()
    const ref = context.school.collection("contactos").doc()
    await auditedCreate(ref,{ ...sealContact(input, ref.path), createdBy: context.admin.uid, createdAt: now },{module:'school-contacts',actorUid:context.admin.uid})
    return NextResponse.json({ contacto: { id: ref.id, ...input } }, { status: 201 })
  } catch (error) {
    if (error instanceof SchoolValidationError || error instanceof SyntaxError)
      return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: "Não foi possível guardar o contacto." }, { status: 500 })
  }
}
