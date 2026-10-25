import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { MaterialReceptionError, parseMaterialReception } from "@/lib/server/material-reception.mjs"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { sealMaterialReception, openMaterialReception } from "@/lib/server/private-records.mjs"

export const runtime = "nodejs"
const collection = "area_material_receptions"
const active = () => process.env.FTB_MATERIAL_DONATIONS_ENABLED === "true"
function denied(status: number, message: string) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET(request: Request) {
  if (!active()) return denied(503, "A receção de material ainda não está ativa.")
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return denied(503, "Serviço ou cifragem indisponíveis.")
  const identity = await requireAreaAdmin(request)
  if (!identity) return denied(403, "Sem permissão para consultar donativos materiais.")
  try {
    const documents = await getFirebaseAdminFirestore().collection(collection)
      .orderBy("criadoEm", "desc").limit(100).get()
    return NextResponse.json({ rececoes: documents.docs.map(doc => ({ id: doc.id, ...openMaterialReception(doc.data(), doc.ref.path) })) })
  } catch {
    return denied(500, "Não foi possível consultar as receções.")
  }
}

export async function POST(request: Request) {
  if (!active()) return denied(503, "A receção de material ainda não está ativa.")
  if (!isFirebaseAdminConfigured() || !isFieldEncryptionConfigured()) return denied(503, "Serviço ou cifragem indisponíveis.")
  const identity = await requireAreaAdmin(request)
  if (!identity) return denied(403, "Sem permissão para registar donativos materiais.")
  try {
    const input = parseMaterialReception(await request.json())
    const ref = getFirebaseAdminFirestore().collection(collection).doc()
    const now = new Date().toISOString()
    const numero = "MAT-" + now.slice(0, 10).replace(/-/g, "") + "-" + ref.id.slice(0, 10).toUpperCase()
    const data = {
      ...sealMaterialReception(input, ref.path), numero, estado: "pendente",
      criadoEm: now, criadoPor: identity.uid, confirmadoEm: null, confirmadoPor: null,
    }
    await ref.create(data)
    return NextResponse.json({ rececao: { id: ref.id, ...data } }, { status: 201 })
  } catch (error) {
    if (error instanceof MaterialReceptionError || error instanceof SyntaxError)
      return denied(400, error.message)
    return denied(500, "Não foi possível registar a receção.")
  }
}