import { NextResponse } from 'next/server'
import { getFirebaseAdminAuth, getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isSchoolCode } from '@/lib/server/schools-validation.mjs'
import { AccessGrantError, EMPTY_ACCESS_GRANT, validateAccessGrant } from '@/lib/server/access-grants.mjs'

export const runtime = 'nodejs'
const featureEnabled = () => process.env.FTB_GRANULAR_ACCESS_ENABLED === 'true'
const reply = (error: string, status: number) => NextResponse.json({ error }, { status })
const goodUid = (uid: string) => typeof uid === 'string' && uid.length >= 2 && uid.length <= 128 && !uid.includes('/')

async function context(request: Request, uid: string) {
  if (!featureEnabled() || !isFirebaseAdminConfigured()) return { error: 'Gestão de permissões indisponível.', status: 503 } as const
  const admin = await requireAreaAdmin(request)
  if (!admin) return { error: 'Apenas administradores podem gerir perfis e permissões.', status: 403 } as const
  if (!goodUid(uid)) return { error: 'Utilizador inválido.', status: 400 } as const
  try {
    const target = await getFirebaseAdminAuth().getUser(uid)
    return { admin, target } as const
  } catch { return { error: 'Utilizador não encontrado.', status: 404 } as const }
}

/** Personal access grants are not a replacement for server-side permission checks. */
export async function GET(request: Request, { params }: { params: { uid: string } }) {
  const ctx = await context(request, params.uid)
  if (!('target' in ctx)) return reply(ctx.error, ctx.status)
  try {
    const record = await getFirebaseAdminFirestore().collection('area_user_access').doc(params.uid).get()
    const grants = record.exists ? validateAccessGrant({
      profiles: record.get('profiles'), schoolCodes: record.get('schoolCodes'), overrides: record.get('overrides'),
    }) : EMPTY_ACCESS_GRANT
    return NextResponse.json({ uid: params.uid, access: grants, revision: Number(record.get('revision') || 0) })
  } catch { return reply('Não foi possível ler permissões.', 500) }
}

/**
 * Only a pre-existing trusted area admin can update grants. No custom grant can
 * mint an administrator, change user management or bypass school scoping.
 */
export async function PUT(request: Request, { params }: { params: { uid: string } }) {
  const ctx = await context(request, params.uid)
  if (!('target' in ctx)) return reply(ctx.error, ctx.status)
  try {
    const raw = await request.json()
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        Object.keys(raw).some(key => !['access', 'expectedRevision'].includes(key)) ||
        !Number.isInteger(raw.expectedRevision) || raw.expectedRevision < 0) {
      return reply('Pedido de permissões inválido.', 400)
    }
    const access = validateAccessGrant(raw.access)
    // Validate the resource scope against actual schools; never create a scope
    // implicitly or grant to a deleted/inactive school.
    const db = getFirebaseAdminFirestore()
    for (const code of access.schoolCodes) {
      if (!isSchoolCode(code)) return reply('Código escolar inválido.', 400)
      const school = await db.collection('area_schools').doc(code).get()
      if (!school.exists || school.get('estado') !== 'ativa') return reply('Uma das escolas selecionadas não está ativa.', 422)
    }
    const ref = db.collection('area_user_access').doc(params.uid)
    const event = db.collection('area_permission_audit').doc()
    const changedAt = new Date().toISOString()
    const result = await db.runTransaction(async tx => {
      const current = await tx.get(ref)
      const revision = current.exists ? current.get('revision') : 0
      if (revision !== raw.expectedRevision) return 'conflict'
      const next = revision + 1
      tx.set(ref, { ...access, revision: next, updatedAt: changedAt, updatedBy: ctx.admin.uid })
      tx.create(event, { type: 'user-access-changed', targetUid: params.uid,
        actorUid: ctx.admin.uid, previousRevision: revision, revision: next, at: changedAt })
      return next
    })
    if (result === 'conflict') return reply('As permissões foram alteradas por outra pessoa. Atualiza e tenta novamente.', 409)
    return NextResponse.json({ success: true, revision: result })
  } catch (error) {
    if (error instanceof AccessGrantError || error instanceof SyntaxError) return reply(error.message, 400)
    return reply('Não foi possível atualizar permissões.', 500)
  }
}
