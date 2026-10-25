import { NextResponse } from "next/server"
import { FieldValue } from "firebase-admin/firestore"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { EncryptionConfigurationError, EncryptedDataError, isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { MemberUpdateError, updateMemberProfile } from "@/lib/server/member-operations.mjs"

export const runtime = "nodejs"
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function PATCH(request: Request, context: { params: { id: string } }) {
  if (!isFirebaseAdminConfigured())
    return NextResponse.json({ error: "Serviço não configurado." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin)
    return NextResponse.json({ error: "Sem autorização para gerir sócios." }, { status: 403 })

  const secureWrites = process.env.FTB_SECURE_MEMBER_REGISTRY === "true"
  if (secureWrites && !isFieldEncryptionConfigured())
    return NextResponse.json({ error: "Cifragem pessoal não configurada." }, { status: 503 })

  try {
    const body = await request.json()
    if (body.estado !== "ativo" && body.estado !== "inativo")
      return NextResponse.json({ error: "Estado do sócio inválido." }, { status: 400 })
    const changes = {
      nome: clean(body.nome, 120),
      telefone: clean(body.telefone, 40),
      numeroSocio: clean(body.numeroSocio, 40),
      observacoes: clean(body.observacoes, 1000),
      estado: body.estado,
    }
    const result = await updateMemberProfile(
      getFirebaseAdminFirestore(), FieldValue, context.params.id,
      changes, admin.uid, { secureWrites },
    )
    if (result === "not-found")
      return NextResponse.json({ error: "Sócio não encontrado." }, { status: 404 })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof MemberUpdateError)
      return NextResponse.json({ error: "Alteração inválida." }, { status: 400 })
    if (error instanceof EncryptionConfigurationError)
      return NextResponse.json({ error: "Cifragem pessoal indisponível." }, { status: 503 })
    if (error instanceof EncryptedDataError)
      return NextResponse.json({ error: "Registo inválido ou não migrado." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível atualizar o sócio." }, { status: 500 })
  }
}
