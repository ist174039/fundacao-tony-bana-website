import "server-only"
import { cert, getApps, initializeApp } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getFirestore } from "firebase-admin/firestore"
import { isAreaAdminIdentity, isEnvironmentAreaAdminIdentity } from "./area-admin-policy.mjs"
import { openMember } from "./member-registry.mjs"

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

function currentAdminAllowlists() {
  return {
    allowedUids: process.env.FIREBASE_AREA_ADMIN_UIDS || "",
    allowedEmails: process.env.FIREBASE_AREA_ADMIN_EMAILS || "",
  }
}

export function isConfiguredAreaAdmin(identity: AreaIdentity) {
  return isAreaAdminIdentity(identity, currentAdminAllowlists())
}

export function isConfiguredAreaAdminUser(user: { uid: string; email?: string; emailVerified?: boolean; customClaims?: Record<string, unknown> }) {
  return isConfiguredAreaAdmin({
    uid: user.uid,
    email: user.email,
    email_verified: user.emailVerified,
    admin: user.customClaims?.admin === true,
  })
}

export function isEnvironmentAreaAdminUser(user: { uid: string; email?: string; emailVerified?: boolean }) {
  return isEnvironmentAreaAdminIdentity({
    uid: user.uid,
    email: user.email,
    email_verified: user.emailVerified,
  }, currentAdminAllowlists())
}

async function getVerifiedAreaIdentity(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null

  try {
    return await getFirebaseAdminAuth().verifyIdToken(token, true)
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "unknown"
    console.error("[area-access] Firebase token verification failed", { code })
    return null
  }
}

export async function requireAreaAdmin(request: Request) {
  const identity = await getVerifiedAreaIdentity(request)
  return identity && isConfiguredAreaAdmin(identity) ? identity : null
}

export async function requireAreaAccess(request: Request) {
  const result = await resolveAreaAccess(request)
  return result.access
}

export async function resolveAreaAccess(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return { access: null, status: 401, error: "Sessão Firebase em falta. Inicia sessão novamente." } as const
  const decoded = await getVerifiedAreaIdentity(request)
  if (!decoded) return { access: null, status: 401, error: "Não foi possível validar a sessão Firebase. Termina a sessão, entra novamente e tenta outra vez." } as const

  if (isConfiguredAreaAdmin(decoded)) {
    return { access: { role: "admin" as const, uid: decoded.uid }, status: 200, error: null }
  }

  if (process.env.FTB_GRANULAR_ACCESS_ENABLED === "true") {
    try {
      const { validateAccessGrant, EMPTY_ACCESS_GRANT } = await import("./access-grants.mjs")
      const grantRecord = await getFirebaseAdminFirestore().collection("area_user_access").doc(decoded.uid).get()
      const raw = grantRecord.exists ? {
        profiles: grantRecord.get("profiles"), schoolCodes: grantRecord.get("schoolCodes"), overrides: grantRecord.get("overrides")
      } : EMPTY_ACCESS_GRANT
      const grant = validateAccessGrant(raw)
      if (grant.profiles.length || grant.overrides.some((item: { allow: boolean }) => item.allow)) {
        return { access: { role: "operational" as const, uid: decoded.uid }, status: 200, error: null }
      }
    } catch {
      return { access: null, status: 503, error: "Não foi possível validar as permissões operacionais." } as const
    }
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
        access: { role: "socio" as const, uid: decoded.uid, socioId: socio.id, socioNome: String(openMember(socio.data(), socio.ref.path).nome || "") },
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
