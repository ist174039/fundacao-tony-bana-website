/**
 * Pure authorization policy for the legacy Foundation area.
 *
 * This handles only the current admin/socio model. A future school-based
 * platform must enforce resource and school/project scope on the server.
 */
function entries(value, normalize = (entry) => entry) {
  return new Set(
    String(value || "")
      .split(",")
      .map((entry) => normalize(entry.trim()))
      .filter(Boolean),
  )
}

/**
 * Trusted custom claims or allowlisted UIDs may grant admin access.
 * An email allowlist is accepted only when Firebase verified that email.
 */
export function isAreaAdminIdentity(identity, { allowedUids = "", allowedEmails = "" } = {}) {
  if (!identity || typeof identity.uid !== "string" || !identity.uid) return false

  if (identity.admin === true) return true
  if (entries(allowedUids).has(identity.uid)) return true

  if (identity.email_verified !== true || typeof identity.email !== "string") return false
  return entries(allowedEmails, (email) => email.toLowerCase())
    .has(identity.email.trim().toLowerCase())
}

/**
 * Identifies admins granted by server environment configuration only,
 * excluding custom claims. Used to prevent in-app edits to managed admins.
 */
export function isEnvironmentAreaAdminIdentity(identity, allowlists = {}) {
  if (!identity) return false
  return isAreaAdminIdentity({ ...identity, admin: false }, allowlists)
}
