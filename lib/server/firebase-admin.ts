import "server-only"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"

export function isFirebaseAdminConfigured() {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
}

function getAdminApp() {
  const existing = getApps()[0]
  if (existing) return existing

  const encoded = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!encoded) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not configured")

  let serviceAccount: { project_id: string; client_email: string; private_key: string }
  try {
    serviceAccount = JSON.parse(encoded)
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON must contain valid JSON")
  }

  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    }),
  })
}

export function getFirebaseAdminAuth() {
  return getAuth(getAdminApp())
}

export function getFirebaseAdminFirestore() {
  return getFirestore(getAdminApp())
}

type AreaIdentity = { uid: string; admin?: boolean; email?: string; email_verified?: boolean }

function configuredAreaAdminUids() {
  const allowlistedUids = (process.env.FIREBASE_AREA_ADMIN_UIDS || "")
    .split(",")
    .map((uid) => uid.trim())
    .filter(Boolean)
  return allowlistedUids
}

function configuredAreaAdminEmails() {
  return (process.env.FIREBASE_AREA_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export function isConfiguredAreaAdmin(identity: AreaIdentity) {
  const allowlistedUids = configuredAreaAdminUids()
  const allowlistedEmails = configuredAreaAdminEmails()
  const emailIsAllowlisted = Boolean(
    identity.email &&
    allowlistedEmails.includes(identity.email.toLowerCase()),
  )

  return identity.admin === true || allowlistedUids.includes(identity.uid) || emailIsAllowlisted
}

export function isConfiguredAreaAdminUser(user: { uid: string; email?: string; emailVerified?: boolean; customClaims?: Record<string, unknown> }) {
  return user.customClaims?.admin === true || isConfiguredAreaAdmin({
    uid: user.uid,
    email: user.email,
    email_verified: user.emailVerified,
  })
}

export async function requireAreaAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token)
    return isConfiguredAreaAdmin(decoded) ? decoded : null
  } catch {
    return null
  }
}

export async function requireAreaAccess(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    if (isConfiguredAreaAdmin(decoded)) return { role: "admin" as const, uid: decoded.uid }

    const socios = await getFirebaseAdminFirestore()
      .collection("area_socios")
      .where("uid", "==", decoded.uid)
      .limit(1)
      .get()
    const socio = socios.docs[0]
    if (!socio || socio.get("estado") !== "ativo") return null

    return {
      role: "socio" as const,
      uid: decoded.uid,
      socioId: socio.id,
      socioNome: String(socio.get("nome") || ""),
    }
  } catch {
    return null
  }
}

export async function resolveAreaAccess(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return { access: null, status: 401, error: "Sessão Firebase em falta. Inicia sessão novamente." } as const

  let decoded
  try {
    decoded = await getFirebaseAdminAuth().verifyIdToken(token)
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"
    console.error("[area-access] Firebase token verification failed", { code })
    return { access: null, status: 401, error: "Não foi possível validar a sessão Firebase. Termina a sessão, entra novamente e tenta outra vez." } as const
  }

  if (isConfiguredAreaAdmin(decoded)) {
    return { access: { role: "admin" as const, uid: decoded.uid }, status: 200, error: null }
  }

  try {
    const socios = await getFirebaseAdminFirestore()
      .collection("area_socios")
      .where("uid", "==", decoded.uid)
      .limit(1)
      .get()
    const socio = socios.docs[0]
    if (socio?.get("estado") === "ativo") {
      return {
        access: { role: "socio" as const, uid: decoded.uid, socioId: socio.id, socioNome: String(socio.get("nome") || "") },
        status: 200,
        error: null,
      }
    }
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"
    console.error("[area-access] Firestore membership lookup failed", { code })
    return { access: null, status: 503, error: "Não foi possível consultar as permissões no Firebase. Tenta novamente mais tarde." } as const
  }

  return { access: null, status: 403, error: "Esta conta não está autorizada. Pede ao administrador da Fundação para confirmar o acesso desta conta." } as const
}
