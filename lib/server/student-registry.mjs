/** Minimal, strictly whitelisted student record. No birth date, photos, grades or login accounts. */
export class StudentInputError extends Error {
  constructor(message) { super(message); this.name = 'StudentInputError' }
}
const schoolCode = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;
const studentCode = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;
const schoolYear = /^20\d{2}\/20\d{2}$/;
function str(value, label, max, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new StudentInputError(`${label}: texto inválido.`);
  const s = value.trim();
  if (s.length > max || (required && s.length < 2)) throw new StudentInputError(`${label}: comprimento inválido.`);
  return s;
}
function email(value) {
  const s = str(value, 'Email do encarregado', 254).toLowerCase();
  if (s && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new StudentInputError('Email do encarregado inválido.');
  return s;
}
export function parseStudentInput(value, { partial = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new StudentInputError('Registo de aluno inválido.');
  const result = {};
  if (!partial || Object.hasOwn(value, 'codigoInterno')) {
    const code = str(value.codigoInterno, 'Código interno', 40, true).toUpperCase();
    if (!studentCode.test(code)) throw new StudentInputError('Código interno inválido.');
    result.codigoInterno = code;
  }
  if (!partial || Object.hasOwn(value, 'escolaCodigo')) {
    const code = str(value.escolaCodigo, 'Escola', 32, true).toUpperCase();
    if (!schoolCode.test(code)) throw new StudentInputError('Código da escola inválido.');
    result.escolaCodigo = code;
  }
  if (!partial || Object.hasOwn(value, 'nome')) result.nome = str(value.nome, 'Nome do aluno', 140, true);
  if (!partial || Object.hasOwn(value, 'responsavelNome')) result.responsavelNome = str(value.responsavelNome, 'Responsável legal', 140, true);
  if (!partial || Object.hasOwn(value, 'responsavelTelefone')) result.responsavelTelefone = str(value.responsavelTelefone, 'Telefone do responsável', 40);
  if (!partial || Object.hasOwn(value, 'responsavelEmail')) result.responsavelEmail = email(value.responsavelEmail);
  if (!partial || Object.hasOwn(value, 'anoLetivo')) {
    const year = str(value.anoLetivo, 'Ano letivo', 9, true);
    if (!schoolYear.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1) throw new StudentInputError('Ano letivo inválido: usa AAAA/AAAA consecutivos.');
    result.anoLetivo = year;
  }
  if (!partial || Object.hasOwn(value, 'classe')) result.classe = str(value.classe, 'Classe', 80);
  if (!partial || Object.hasOwn(value, 'estado')) {
    const state = value.estado ?? 'ativo';
    if (!['ativo', 'inativo'].includes(state)) throw new StudentInputError('Estado inválido.');
    result.estado = state;
  }
  if (!partial || Object.hasOwn(value, 'observacoes')) result.observacoes = str(value.observacoes, 'Observações', 500);
  if (!partial && !result.responsavelTelefone && !result.responsavelEmail)
    throw new StudentInputError('Indica pelo menos um contacto do encarregado.');
  if (partial && !Object.keys(result).length) throw new StudentInputError('Nenhuma alteração válida.');
  return result;
}

/** Always encrypt identifiers, names, guardian contacts, school class, and notes. */
export const studentPrivateFields = Object.freeze(['codigoInterno', 'nome', 'responsavelNome', 'responsavelTelefone', 'responsavelEmail', 'anoLetivo', 'classe', 'observacoes']);
export function projectStudentPublicFields(value) {
  return { escolaCodigo: value.escolaCodigo, estado: value.estado };
}
