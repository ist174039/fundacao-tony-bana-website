import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured, resolveAreaAccess } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A área ainda não está configurada no servidor." }, { status: 503 })
  const result = await resolveAreaAccess(request)
  if (!result.access) return NextResponse.json({ error: result.error }, { status: result.status })
  return NextResponse.json(result.access)
}
