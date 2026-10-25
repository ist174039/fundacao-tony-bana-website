import { NextResponse } from "next/server"
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured } from "@/lib/server/firebase-admin"
import { isFieldEncryptionConfigured } from "@/lib/server/field-encryption.mjs"
import { sealMembershipIntention } from "@/lib/server/membership-privacy.mjs"

export const runtime = "nodejs"

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : ""

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "O formulário está temporariamente indisponível." }, { status: 503 })
  // New enquiries must never persist private fields in plaintext.
  if (process.env.FTB_ENCRYPT_MEMBERSHIP_INTENTIONS !== "true" || !isFieldEncryptionConfigured()) {
    return NextResponse.json({ error: "O formulário está temporariamente indisponível." }, { status: 503 })
  }
  try {
    const body = await request.json()
    // Honeypot: bots tend to fill every field; respond successfully without storing it.
    if (clean(body.website, 200)) return NextResponse.json({ ok: true }, { status: 201 })

    const nome = clean(body.nome, 120)
    const email = clean(body.email, 254).toLowerCase()
    const telefone = clean(body.telefone, 40)
    const mensagem = clean(body.mensagem, 1000)
    const tipo = body.tipo === "duvida" ? "duvida" : body.tipo === "adesao" ? "adesao" : ""
    const consentimento = body.consentimento === true
    if (!tipo || nome.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || (tipo === "adesao" && telefone.length < 6) || (tipo === "duvida" && mensagem.length < 2) || !consentimento) {
      return NextResponse.json({ error: "Confirma o nome, email, assunto e consentimento para enviar a mensagem." }, { status: 400 })
    }

    const payload = {
      nome,
      email,
      telefone,
      mensagem,
      tipo,
      consentimento: true,
      consentidoEm: new Date().toISOString(),
      estado: "pendente",
      criadoEm: new Date().toISOString(),
    }
    const collection = getFirebaseAdminFirestore().collection("area_membership_intentions")
    const ref = collection.doc()
    await ref.create(sealMembershipIntention(payload, ref.path))
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Não foi possível enviar o pedido. Tenta novamente mais tarde." }, { status: 500 })
  }
}
