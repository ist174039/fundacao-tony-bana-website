import {operationalActor,permittedSchool} from '@/lib/server/operational-authorization'
import { appendAuditEvent } from '@/lib/server/audit-log.mjs'
import { NextResponse } from 'next/server'
import { isOperationalModuleEnabled } from '@/lib/server/module-settings'
import { getFirebaseAdminFirestore, isFirebaseAdminConfigured, requireAreaAdmin } from '@/lib/server/firebase-admin'
import { isFieldEncryptionConfigured } from '@/lib/server/field-encryption.mjs'
import { parseStudentInput, StudentInputError } from '@/lib/server/student-registry.mjs'
import { isStudentIndexConfigured, sealStudent, openStudent } from '@/lib/server/student-private.mjs'
export const runtime = 'nodejs'
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!(await isOperationalModuleEnabled('students'))) return NextResponse.json({ error: 'Módulo desativado na Configuração.' }, { status: 503 })
  if (process.env.FTB_STUDENTS_ENABLED !== 'true' || !isFirebaseAdminConfigured() || !isFieldEncryptionConfigured() || !isStudentIndexConfigured())
    return NextResponse.json({ error: 'Registo de alunos indisponível.' }, { status: 503 })
  const admin = await operationalActor(request,'students','update')
  if (!admin) return NextResponse.json({ error: 'Sem permissão.' }, { status: 403 })
  if (!/^[a-f0-9]{64}$/.test(params.id)) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 })
  try {
    const raw = await request.json()
    if (raw && typeof raw === 'object' && ('codigoInterno' in raw || 'escolaCodigo' in raw))
      return NextResponse.json({ error: 'Transferências e alterações de identidade exigem processo próprio.' }, { status: 400 })
    const patch = parseStudentInput(raw, { partial: true })
    const ref = getFirebaseAdminFirestore().collection('area_students').doc(params.id)
    const result = await getFirebaseAdminFirestore().runTransaction(async tx => {
      const snapshot = await tx.get(ref)
      if (!snapshot.exists) return 'missing'
      if(!permittedSchool(admin, snapshot.get('escolaCodigo'))) return 'denied'
      const prior = openStudent(snapshot.data(), ref.path)
      // Preserve encrypted data and rewrite the authenticated envelope atomically.
      const updated={ ...sealStudent({ ...prior, ...patch }, ref.path), updatedAt: new Date().toISOString(), updatedBy: admin.uid }
      tx.update(ref,updated)
      appendAuditEvent(tx,getFirebaseAdminFirestore(),{module:'students',action:'update',recordPath:ref.path,actorUid:admin.uid,before:snapshot.data(),after:updated})
      return 'updated'
    })
    return result === 'denied' ? NextResponse.json({error:'Sem acesso a esta escola.'},{status:403}) : result === 'missing' ? NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 }) : NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof StudentInputError || error instanceof SyntaxError) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ error: 'Não foi possível atualizar o aluno.' }, { status: 500 })
  }
}
