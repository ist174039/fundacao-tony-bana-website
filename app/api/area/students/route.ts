import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { parseStudentInput, StudentInputError } from '@/lib/server/student-registry.mjs'
import { isStudentIndexConfigured, studentDocumentId, sealStudent, openStudent } from '@/lib/server/student-private.mjs'
export const runtime = 'nodejs'
const disabled = () => process.env.FTB_STUDENTS_ENABLED !== 'true'
const ready = () => isFirebaseAdminConfigured() && isFieldEncryptionConfigured() && isStudentIndexConfigured()
const fail = (message: string, status: number) => NextResponse.json({ error: message }, { status })
/** Admin-only pilot. Never make this route available to a school-scoped role without ABAC rules. */
export async function GET(request: Request) {
  if (!(await isOperationalModuleEnabled('students'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (disabled() || !ready()) return fail('Registo de alunos indisponível.', 503)
  if (!(await requireAreaAdmin(request))) return fail('Sem permissão.', 403)
  try {
    const rows = await getFirebaseAdminFirestore().collection('area_students').orderBy('createdAt', 'desc').limit(200).get()
    return NextResponse.json({ alunos: rows.docs.map(doc => ({ id: doc.id, ...openStudent(doc.data(), doc.ref.path) })) })
  } catch { return fail('Não foi possível consultar alunos.', 500) }
}
export async function POST(request: Request) {
  if (!(await isOperationalModuleEnabled('students'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (disabled() || !ready()) return fail('Registo de alunos indisponível.', 503)
  const admin = await requireAreaAdmin(request)
  if (!admin) return fail('Sem permissão.', 403)
  try {
    const data = parseStudentInput(await request.json())
    const db = getFirebaseAdminFirestore()
    const school = await db.collection('area_schools').doc(data.escolaCodigo).get()
    if (!school.exists || school.get('estado') !== 'ativa') return fail('Escola ativa não encontrada.', 422)
    const id = studentDocumentId(data.escolaCodigo, data.codigoInterno)
    const ref = db.collection('area_students').doc(id)
    const now = new Date().toISOString()
    await ref.create({ ...sealStudent(data, ref.path), createdAt: now, updatedAt: now, createdBy: admin.uid, updatedBy: admin.uid })
    return NextResponse.json({ aluno: { id, escolaCodigo: data.escolaCodigo, codigoInterno: data.codigoInterno } }, { status: 201 })
  } catch (error) {
    if (error instanceof StudentInputError || error instanceof SyntaxError) return fail(error.message, 400)
    if ((error as {code?: number | string})?.code === 6 || (error as {code?: number | string})?.code === 'already-exists') return fail('Aluno já registado nesta escola.', 409)
    return fail('Não foi possível registar o aluno.', 500)
  }
}
