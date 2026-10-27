import { auditedCreate } from '@/lib/server/audit-log.mjs'
import { NextResponse } from "next/server"
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { parseSchoolInput, SchoolValidationError } from "@/lib/server/schools-validation.mjs"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { sealSchool, openSchool } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"
const collectionName = "area_schools"

function enabled() {
  return process.env.FTB_SCHOOLS_ENABLED === "true"
}

export async function GET(request: Request) {
  if (!(await isOperationalModuleEnabled('schools'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (!enabled()) return NextResponse.json({ error: "O módulo de escolas ainda não está ativo." }, { status: 503 })
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return NextResponse.json({ error: "Servidor ou cifragem de dados pessoais não configurados." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 })
  try {
    const data = await getFirebaseAdminFirestore().collection(collectionName).orderBy("nome").limit(200).get()
    return NextResponse.json({ escolas: data.docs.map((doc) => ({ id: doc.id, ...openSchool(doc.data(), doc.ref.path) })) })
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar escolas." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!(await isOperationalModuleEnabled('schools'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (!enabled()) return NextResponse.json({ error: "O módulo de escolas ainda não está ativo." }, { status: 503 })
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return NextResponse.json({ error: "Servidor ou cifragem de dados pessoais não configurados." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 })
  try {
    const body = parseSchoolInput(await request.json())
    const { codigo, ...school } = body
    const ref = getFirebaseAdminFirestore().collection(collectionName).doc(codigo)
    const now = new Date().toISOString()
    await auditedCreate(ref,{ ...sealSchool({ ...school, codigo }, ref.path), createdAt: now, updatedAt: now, createdBy: admin.uid, updatedBy: admin.uid },{module:'schools',actorUid:admin.uid})
    return NextResponse.json({ escola: { id: codigo, ...school, codigo } }, { status: 201 })
  } catch (error) {
    if (error instanceof SchoolValidationError || error instanceof SyntaxError)
      return NextResponse.json({ error: error.message }, { status: 400 })
    if ((error as { code?: string | number })?.code === 6 || (error as { code?: string | number })?.code === "already-exists")
      return NextResponse.json({ error: "Esta escola já está registada." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível criar a escola." }, { status: 500 })
  }
}
