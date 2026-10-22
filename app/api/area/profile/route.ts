import { NextResponse } from "next/server"
import { getFirebaseAdminAuth, isFirebaseAdminConfigured, resolveAreaAccess } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const result = await resolveAreaAccess(request)
  if (!result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  try {
    const user = await getFirebaseAdminAuth().getUser(result.access.uid)
    return NextResponse.json({ uid: user.uid, email: user.email ?? "", displayName: user.displayName ?? "", role: result.access.role })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar o perfil." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const result = await resolveAreaAccess(request)
  if (!result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  try {
    const body = await request.json()
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
    if (displayName.length < 2 || displayName.length > 100) return NextResponse.json({ error: "O nome deve ter entre 2 e 100 caracteres." }, { status: 400 })
    await getFirebaseAdminAuth().updateUser(result.access.uid, { displayName })
    return NextResponse.json({ success: true, displayName })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o perfil." }, { status: 500 })
  }
}
