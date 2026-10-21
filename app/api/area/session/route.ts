import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured, requireAreaAccess } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const access = await requireAreaAccess(request)
  if (!access) return NextResponse.json({ error: "Esta conta não tem acesso à área de trabalho." }, { status: 403 })
  return NextResponse.json(access)
}
