import { appendAuditEvent, auditedUpdate, writeExternalAudit } from '@/lib/server/audit-log.mjs'
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isConfiguredAreaAdminUser, isEnvironmentAreaAdminUser, isFirebaseAdminConfigured, requireAreaAdmin } from "@/lib/server/firebase-admin"
import { openMember, memberEmailMatches } from "@/lib/server/member-registry.mjs"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A gestão de utilizadores ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir utilizadores." }, { status: 403 })

  try {
    const result = await getFirebaseAdminAuth().listUsers(1000)
    const socioSnapshot = await getFirebaseAdminFirestore().collection("area_socios").get()
    const socioByUid = new Map(socioSnapshot.docs.filter((doc) => typeof doc.get("uid") === "string").map((doc) => [doc.get("uid") as string, String(openMember(doc.data(), doc.ref.path).nome || "")]))
    return NextResponse.json({
      users: result.users.map((user) => ({
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? "",
        disabled: user.disabled,
        createdAt: user.metadata.creationTime,
        lastSignInAt: user.metadata.lastSignInTime ?? null,
        isAdmin: isConfiguredAreaAdminUser(user),
        managedAdmin: user.customClaims?.admin === true && !isEnvironmentAreaAdminUser(user),
        linkedSocio: socioByUid.get(user.uid) ?? null,
      })),
    })
  } catch {
    return NextResponse.json({ error: "Não foi possível carregar os utilizadores." }, { status: 500 })
  }
}

export async function POST(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A gestão de utilizadores ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir utilizadores." }, { status: 403 })

  try {
    const body = await request.json()
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : ""
    const socioId = typeof body.socioId === "string" ? body.socioId : ""
    if (!/^\S+@\S+\.\S+$/.test(email) || displayName.length < 2 || displayName.length > 100) {
      return NextResponse.json({ error: "Indica um nome e um email válidos." }, { status: 400 })
    }
    if (!socioId) return NextResponse.json({ error: "Seleciona o sócio a associar à conta." }, { status: 400 })

    const auth = getFirebaseAdminAuth()
    const socioRef = socioId ? getFirebaseAdminFirestore().collection("area_socios").doc(socioId) : null
    if (socioRef) {
      const socio = await socioRef.get()
      if (!socio.exists || socio.get("estado") !== "ativo") {
        return NextResponse.json({ error: "O sócio selecionado não existe ou está inativo." }, { status: 400 })
      }
      if (!memberEmailMatches(socio.data(), socioRef!.path, email)) {
        return NextResponse.json({ error: "O email da conta deve coincidir com o email do registo do sócio." }, { status: 400 })
      }
      if (socio.get("uid")) return NextResponse.json({ error: "Este sócio já tem uma conta associada." }, { status: 409 })
    }
    const dbForAudit=getFirebaseAdminFirestore()
    await writeExternalAudit(dbForAudit,{module:'users',action:'auth-create',recordPath:'firebase_auth/users/new',actorUid:admin.uid,after:{email,displayName},source:'auth-intent'})
    const user = await auth.createUser({
      email,
      displayName,
      password: randomBytes(32).toString("base64url"),
      emailVerified: false,
    })
    try {
      if (socioRef) {
        const changed=await auditedUpdate(socioRef,{uid:user.uid,accountLinkedAt:new Date().toISOString(),updatedBy:admin.uid},{module:'socios',actorUid:admin.uid,action:'link'})
        if(!changed)throw new Error('Membership not found')
      }
    } catch {
      await auth.deleteUser(user.uid)
      throw new Error("Unable to link user to membership")
    }
    await writeExternalAudit(dbForAudit,{module:'users',action:'auth-create',recordPath:'firebase_auth/users/'+user.uid,actorUid:admin.uid,after:{uid:user.uid,displayName,linkedSocio:Boolean(socioRef)},source:'auth-completed'})
    return NextResponse.json({ user: { uid: user.uid, email, displayName }, linkedSocio: Boolean(socioRef) }, { status: 201 })
  } catch (error) {
    const code = (error as { code?: string })?.code
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Já existe uma conta com este email." }, { status: 409 })
    }
    return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  if (!isFirebaseAdminConfigured()) return NextResponse.json({ error: "A gestão de utilizadores ainda não está configurada no servidor." }, { status: 503 })
  const admin = await requireAreaAdmin(request)
  if (!admin) return NextResponse.json({ error: "Sem autorização para gerir utilizadores." }, { status: 403 })

  try {
    const body = await request.json()
    const uid = typeof body.uid === "string" ? body.uid : ""
    const disabled = body.disabled
    const linkSocioId = typeof body.linkSocioId === "string" ? body.linkSocioId : ""
    const adminRole = body.admin
    if (uid && typeof adminRole === "boolean" && typeof disabled === "undefined" && !linkSocioId) {
      const auth = getFirebaseAdminAuth()
      const target = await auth.getUser(uid)
      if (isEnvironmentAreaAdminUser(target)) return NextResponse.json({ error: "As permissões deste administrador são geridas pela configuração segura do servidor." }, { status: 400 })
      if (uid === admin.uid && !adminRole) return NextResponse.json({ error: "Não podes remover as tuas próprias permissões administrativas." }, { status: 400 })
      if (!adminRole && isConfiguredAreaAdminUser(target)) {
        let pageToken: string | undefined
        let activeAdmins = 0
        do {
          const page = await auth.listUsers(1000, pageToken)
          activeAdmins += page.users.filter((user) => !user.disabled && isConfiguredAreaAdminUser(user)).length
          pageToken = page.pageToken
        } while (pageToken)
        if (activeAdmins <= 1) return NextResponse.json({ error: "Não é possível remover o último administrador ativo." }, { status: 409 })
      }
      await writeExternalAudit(getFirebaseAdminFirestore(),{module:'users',action:'auth-update',recordPath:'firebase_auth/users/'+uid,actorUid:admin.uid,before:{admin:target.customClaims?.admin===true},after:{admin:adminRole},source:'auth-intent'})
      await auth.setCustomUserClaims(uid, { ...target.customClaims, admin: adminRole })
      await auth.revokeRefreshTokens(uid)
      await writeExternalAudit(getFirebaseAdminFirestore(),{module:'users',action:'auth-update',recordPath:'firebase_auth/users/'+uid,actorUid:admin.uid,before:{admin:target.customClaims?.admin===true},after:{admin:adminRole},source:'auth-completed'})
      return NextResponse.json({ success: true })
    }
    if (uid && linkSocioId && typeof disabled === "undefined") {
      const auth = getFirebaseAdminAuth()
      const target = await auth.getUser(uid)
      const db = getFirebaseAdminFirestore()
      const socioRef = db.collection("area_socios").doc(linkSocioId)
      const result = await db.runTransaction(async (transaction) => {
        const socio = await transaction.get(socioRef)
        if (!socio.exists || socio.get("estado") !== "ativo") return "invalid"
        if (socio.get("uid")) return "linked"
        if (!memberEmailMatches(socio.data(), socioRef.path, target.email || "")) return "email"
        const linked={uid,accountLinkedAt:new Date().toISOString(),updatedBy:admin.uid}
        transaction.update(socioRef,linked)
        appendAuditEvent(transaction,db,{module:'socios',action:'link',recordPath:socioRef.path,actorUid:admin.uid,before:socio.data(),after:{...socio.data(),...linked}})
        return "ok"
      })
      if (result === "invalid") return NextResponse.json({ error: "O sócio selecionado não existe ou está inativo." }, { status: 400 })
      if (result === "linked") return NextResponse.json({ error: "Este sócio já tem uma conta associada." }, { status: 409 })
      if (result === "email") return NextResponse.json({ error: "O email da conta não coincide com o email do registo do sócio." }, { status: 400 })
      return NextResponse.json({ success: true })
    }
    if (!uid || typeof disabled !== "boolean") {
      return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
    }
    if (uid === admin.uid && disabled) {
      return NextResponse.json({ error: "Não podes desativar a tua própria conta." }, { status: 400 })
    }

    const auth = getFirebaseAdminAuth()
    if (disabled) {
      const target = await auth.getUser(uid)
      if (isConfiguredAreaAdminUser(target)) {
        let pageToken: string | undefined
        let activeAdmins = 0
        do {
          const page = await auth.listUsers(1000, pageToken)
          activeAdmins += page.users.filter((user) => !user.disabled && isConfiguredAreaAdminUser(user)).length
          pageToken = page.pageToken
        } while (pageToken)
        if (activeAdmins <= 1) {
          return NextResponse.json({ error: "Não é possível desativar o último administrador ativo." }, { status: 409 })
        }
      }
    }

    const priorUser=await auth.getUser(uid)
    await writeExternalAudit(getFirebaseAdminFirestore(),{module:'users',action:'auth-update',recordPath:'firebase_auth/users/'+uid,actorUid:admin.uid,before:{disabled:priorUser.disabled},after:{disabled},source:'auth-intent'})
    await auth.updateUser(uid, { disabled })
    if (disabled) await auth.revokeRefreshTokens(uid)
    await writeExternalAudit(getFirebaseAdminFirestore(),{module:'users',action:'auth-update',recordPath:'firebase_auth/users/'+uid,actorUid:admin.uid,before:{disabled:priorUser.disabled},after:{disabled},source:'auth-completed'})
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Não foi possível atualizar o utilizador." }, { status: 500 })
  }
}
