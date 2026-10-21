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

export async function requireAreaAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    const allowlisted = (process.env.FIREBASE_AREA_ADMIN_UIDS || "")
      .split(",")
      .map((uid) => uid.trim())
      .filter(Boolean)
      .includes(decoded.uid)

    return decoded.admin === true || allowlisted ? decoded : null
  } catch {
    return null
  }
}

export async function requireAreaAccess(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return null

  try {
    const decoded = await getFirebaseAdminAuth().verifyIdToken(token, true)
    const allowlisted = (process.env.FIREBASE_AREA_ADMIN_UIDS || "")
      .split(",")
      .map((uid) => uid.trim())
      .filter(Boolean)
      .includes(decoded.uid)

    if (decoded.admin === true || allowlisted) return { role: "admin" as const, uid: decoded.uid }

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
