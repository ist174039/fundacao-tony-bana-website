/**
 * Pure validation for the initial institutional school registry.
 *
 * Note: no pupil records or educational data are accepted by these parsers.
 */
export class SchoolValidationError extends Error {
  constructor(message) {
    super(message)
    this.name = "SchoolValidationError"
  }
}

export const isSchoolCode = (value) =>
  typeof value === "string" && /^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(value)

function stringField(value, label, max, required = false) {
  if (typeof value !== "string") {
    if (!required && (value === undefined || value === null)) return ""
    throw new SchoolValidationError(`${label}: texto inválido.`)
  }
  const text = value.trim()
  if ((required && text.length < 2) || text.length > max) {
    throw new SchoolValidationError(`${label}: comprimento inválido.`)
  }
  return text
}

function validDate(value, label) {
  const text = stringField(value, label, 10)
  if (!text) return ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text)) ||
    new Date(text).toISOString().slice(0, 10) !== text) {
    throw new SchoolValidationError(`${label}: data inválida.`)
  }
  return text
}

function optionalEmail(value) {
  const email = stringField(value, "Email", 254).toLowerCase()
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new SchoolValidationError("Email inválido.")
  }
  return email
}

export function parseSchoolInput(raw, { partial = false } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new SchoolValidationError("Escola: dados inválidos.")
  }

  const result = {}
  if (!partial || Object.hasOwn(raw, "codigo")) {
    const code = stringField(raw.codigo, "Código", 32, true).toUpperCase()
    if (!isSchoolCode(code)) throw new SchoolValidationError("Código: usa 3–32 letras, números, - ou _.")
    result.codigo = code
  }
  if (!partial || Object.hasOwn(raw, "nome")) result.nome = stringField(raw.nome, "Nome", 140, true)
  if (!partial || Object.hasOwn(raw, "pais")) result.pais = stringField(raw.pais, "País", 80, true)
  for (const [field, label, max] of [
    ["regiao", "Região", 120],
    ["municipio", "Município", 120],
    ["localidade", "Localidade", 120],
    ["endereco", "Endereço", 240],
    ["telefone", "Telefone", 40],
  ]) {
    if (!partial || Object.hasOwn(raw, field)) result[field] = stringField(raw[field], label, max)
  }
  if (!partial || Object.hasOwn(raw, "email")) result.email = optionalEmail(raw.email)
  if (!partial || Object.hasOwn(raw, "estado")) {
    const estado = raw.estado ?? "ativa"
    if (!["ativa", "inativa"].includes(estado)) throw new SchoolValidationError("Estado inválido.")
    result.estado = estado
  }
  if (partial && !Object.keys(result).length) throw new SchoolValidationError("Nenhuma alteração válida.")
  return result
}

export function parseSchoolContactInput(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new SchoolValidationError("Contacto inválido.")
  const nome = stringField(raw.nome, "Nome", 140, true)
  const cargo = stringField(raw.cargo, "Cargo", 100, true)
  const email = optionalEmail(raw.email)
  const telefone = stringField(raw.telefone, "Telefone", 40)
  const inicio = validDate(raw.inicio, "Início")
  const fim = validDate(raw.fim, "Fim")
  if (!email && !telefone) throw new SchoolValidationError("Indica email ou telefone.")
  if (inicio && fim && inicio > fim) throw new SchoolValidationError("Fim anterior ao início.")
  if (raw.principal !== undefined && typeof raw.principal !== "boolean") throw new SchoolValidationError("Principal inválido.")
  return { nome, cargo, email, telefone, inicio, fim, principal: raw.principal === true }
}
