import { NextResponse } from 'next/server'
import { isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { listModuleStatuses, updateOperationalModule } from '@/lib/server/module-settings'
import { parseModuleChange, ModuleSettingsError } from '@/lib/server/module-registry.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } })

/** Strictly privileged: do not expose readiness or server configuration to public users. */
export async function GET(request: Request) {
  if (!isFirebaseAdminConfigured()) return fail('Configuração administrativa indisponível.', 503)
  const admin = await requireAreaAdmin(request)
  if (!admin) return fail('Acesso reservado ao administrador.', 403)
  try {
    return NextResponse.json({ modules: await listModuleStatuses() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return fail('Não foi possível consultar a configuração dos módulos.', 503) }
}

export async function PUT(request: Request) {
  if (!isFirebaseAdminConfigured()) return fail('Configuração administrativa indisponível.', 503)
  const admin = await requireAreaAdmin(request)
  if (!admin) return fail('Acesso reservado ao administrador.', 403)
  try {
    const input = parseModuleChange(await request.json())
    const result = await updateOperationalModule(input, admin.uid)
    if (result.result === 'blocked') return NextResponse.json({ error: 'Faltam condições técnicas ou dependências para ativar este módulo.', blockers: result.blockers }, { status: 409, headers: { 'Cache-Control': 'no-store' } })
    if (result.result === 'conflict') return fail('Esta configuração foi alterada por outra pessoa. Atualiza a lista e tenta novamente.', 409)
    return NextResponse.json({ success: true, result: result.result, modules: await listModuleStatuses() }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof ModuleSettingsError) return fail(error.message, 400)
    return fail('Não foi possível alterar a configuração dos módulos.', 503)
  }
}
