import {operationalActor} from '@/lib/server/operational-authorization'
import { auditedUpdate } from '@/lib/server/audit-log.mjs'
import { NextResponse } from "next/server"
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { isSchoolCode, parseSchoolInput, SchoolValidationError } from "@/lib/server/schools-validation.mjs"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { patchSchool } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"

export async function PATCH(request: Request, { params }: { params: { code: string } }) {
  if (!(await isOperationalModuleEnabled('schools'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (process.env.FTB_SCHOOLS_ENABLED !== "true") return NextResponse.json({ error: "Módulo indisponível." }, { status: 503 })
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return NextResponse.json({ error: "Servidor ou cifragem não configurados." }, { status: 503 })
  const code = params.code?.toUpperCase()
  const admin = await operationalActor(request,'schools','update',code)
  if (!admin) return NextResponse.json({ error: "Acesso não autorizado." }, { status: 403 })
  if (!isSchoolCode(code)) return NextResponse.json({ error: "Código de escola inválido." }, { status: 400 })
  try {
    const raw = await request.json()
    if (raw && typeof raw === "object" && Object.hasOwn(raw, "codigo"))
      return NextResponse.json({ error: "O código de escola não pode ser alterado." }, { status: 400 })
    const changes = parseSchoolInput(raw, { partial: true })
    const ref = getFirebaseAdminFirestore().collection("area_schools").doc(code)
    const prior = await ref.get()
    if (!prior.exists) return NextResponse.json({ error: "Escola não encontrada." }, { status: 404 })
    await auditedUpdate(ref,{ ...patchSchool(changes, prior.data(), ref.path), updatedBy: admin.uid, updatedAt: new Date().toISOString() },{module:'schools',actorUid:admin.uid})
    return NextResponse.json({ success: true, id: code })
  } catch (error) {
    if (error instanceof SchoolValidationError || error instanceof SyntaxError)
      return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: "Não foi possível atualizar a escola." }, { status: 500 })
  }
}
