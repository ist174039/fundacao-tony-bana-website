import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { EncryptionConfigurationError, EncryptedDataError, isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { isMemberIndexConfigured } from "@/lib/server/member-registry.mjs"
import { IntentionReviewError, reviewMembershipIntention } from "@/lib/server/intention-review.mjs"

export const runtime = "nodejs"

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isFirebaseAdminConfigured())
    return NextResponse.json({ error: "Serviço não configurado." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin)
    return NextResponse.json({ error: "Sem autorização para rever pedidos." }, { status: 403 })

  const secureMembers = process.env.FTB_SECURE_MEMBER_REGISTRY === "true"
  if (secureMembers && (process.env.FTB_ENCRYPT_FINANCIAL_PII !== "true" ||
      !isFieldEncryptionConfigured() || !isMemberIndexConfigured()))
    return NextResponse.json({ error: "Registo seguro de sócios não configurado." }, { status: 503 })

  try {
    const { id } = await context.params
    const { estado } = await request.json()
    const result = await reviewMembershipIntention(
      getFirebaseAdminFirestore(), id, estado, admin.uid, { secureMembers },
    )
    switch (result.status) {
      case "not-found":
        return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 })
      case "reviewed":
        return NextResponse.json({ error: "Este pedido já foi revisto." }, { status: 409 })
      case "already-member":
        return NextResponse.json({ error: "Já existe um sócio com este email." }, { status: 409 })
      case "secure-mode-required":
        return NextResponse.json({ error: "A aprovação exige o modo seguro de sócios." }, { status: 503 })
      case "invalid-transition":
      case "invalid-email":
      case "invalid-name":
        return NextResponse.json({ error: "Transição ou dados do pedido inválidos." }, { status: 400 })
      default:
        return NextResponse.json({ ok: true, ...(result.socioId ? { socioId: result.socioId } : {}) })
    }
  } catch (error) {
    if (error instanceof IntentionReviewError)
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
    if (error instanceof EncryptionConfigurationError)
      return NextResponse.json({ error: "Cifragem indisponível." }, { status: 503 })
    if (error instanceof EncryptedDataError)
      return NextResponse.json({ error: "Dados protegidos inconsistentes." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível rever o pedido." }, { status: 500 })
  }
}
