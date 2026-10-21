import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"

export const runtime = "nodejs"

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "O formulário está temporariamente indisponível." }, { status: 503 })
  try {
    const body = await request.json()
    // Honeypot: bots tend to fill every field; respond successfully without storing it.
    if (clean(body.website, 200)) return NextResponse.json({ ok: true }, { status: 201 })

    const nome = clean(body.nome, 120)
    const email = clean(body.email, 254).toLowerCase()
    const telefone = clean(body.telefone, 40)
    const mensagem = clean(body.mensagem, 1000)
    const consentimento = body.consentimento === true
    if (nome.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || telefone.length < 6 || !consentimento) {
      return NextResponse.json({ error: "Confirma o nome, email, telefone e consentimento para enviar o pedido." }, { status: 400 })
    }

    await getFirebaseAdminFirestore().collection("area_membership_intentions").add({
      nome,
      email,
      telefone,
      mensagem,
      consentimento: true,
      consentidoEm: new Date().toISOString(),
      estado: "pendente",
      criadoEm: new Date().toISOString(),
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o pedido. Tenta novamente mais tarde." }, { status: 500 })
  }
}
