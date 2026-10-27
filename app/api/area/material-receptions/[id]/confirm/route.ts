import { NextResponse } from "next/server"
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { confirmMaterialReceipt } from "@/lib/server/material-stock.mjs"

export const runtime = "nodejs"

/**
 * Physical confirmation adds stock only once using a Firestore transaction.
 * Only an authenticated area administrator may perform this operation.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!(await isOperationalModuleEnabled('material'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (process.env.FTB_MATERIAL_DONATIONS_ENABLED !== "true")
    return NextResponse.json({ error: "Módulo indisponível." }, { status: 503 })
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured())
    return NextResponse.json({ error: "Serviço indisponível." }, { status: 503 })

  const admin = await requireAreaAdmin(request)
  if (!admin)
    return NextResponse.json({ error: "Sem autorização para confirmar receções." }, { status: 403 })

  const id = params.id
  if (!/^[a-zA-Z0-9]{12,40}$/.test(id))
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 })

  try {
    const result = await confirmMaterialReceipt(getFirebaseAdminFirestore(), id, admin.uid)
    if (result === "not-found")
      return NextResponse.json({ error: "Receção não encontrada." }, { status: 404 })
    if (result === "invalid-state")
      return NextResponse.json({ error: "Estado inválido para confirmação." }, { status: 409 })
    return NextResponse.json({
      estado: "confirmada",
      novaConfirmacao: result === "confirmed",
      id,
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar a entrada em stock." }, { status: 500 })
  }
}
