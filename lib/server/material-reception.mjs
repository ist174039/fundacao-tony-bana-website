/**
 * Inputs for material donations. This parser never accepts user-controlled
 * createdBy, status, receivedBy or stock fields.
 */
export class MaterialReceptionError extends Error {
  constructor(message) {
    super(message)
    this.name = "MaterialReceptionError"
  }
}
const str = (value, max, label, required = false) => {
  if (value == null && !required) return ""
  if (typeof value !== "string") throw new MaterialReceptionError(label + ": inválido.")
  const text = value.trim()
  if (text.length > max || (required && text.length < 2))
    throw new MaterialReceptionError(label + ": comprimento inválido.")
  return text
}
const optionalEmail = (value) => {
  const text = str(value, 254, "Email").toLowerCase()
  if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))
    throw new MaterialReceptionError("Email inválido.")
  return text
}
const units = new Set(["un", "kg", "l", "caixa", "pacote", "m", "outro"])
const conditions = new Set(["novo", "usado_bom", "usado_rever"])
function item(raw, index) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new MaterialReceptionError("Linha " + (index + 1) + " inválida.")
  const quantidade = raw.quantidade
  if (typeof quantidade !== "number" || !Number.isFinite(quantidade) ||
      quantidade <= 0 || quantidade > 1000000 ||
      Math.round(quantidade * 1000) !== quantidade * 1000) {
    throw new MaterialReceptionError("Quantidade inválida na linha " + (index + 1) + ".")
  }
  if (!units.has(raw.unidade)) throw new MaterialReceptionError("Unidade inválida na linha " + (index + 1) + ".")
  const estado = raw.estado || "novo"
  if (!conditions.has(estado)) throw new MaterialReceptionError("Estado material inválido na linha " + (index + 1) + ".")
  return {
    categoria: str(raw.categoria, 80, "Categoria", true),
    descricao: str(raw.descricao, 180, "Descrição", true),
    quantidade,
    unidade: raw.unidade,
    estado,
  }
}
export function parseMaterialReception(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new MaterialReceptionError("Receção inválida.")
  const anonymous = raw.anonimo === true
  if (raw.anonimo !== undefined && typeof raw.anonimo !== "boolean")
    throw new MaterialReceptionError("Tipo de doador inválido.")
  const donorType = raw.tipoDoador ?? "pessoa"
  if (!["pessoa", "organizacao"].includes(donorType))
    throw new MaterialReceptionError("Tipo de doador inválido.")
  if (!Array.isArray(raw.itens) || raw.itens.length < 1 || raw.itens.length > 50)
    throw new MaterialReceptionError("Indica 1 a 50 artigos por receção.")
  const lines = raw.itens.map(item)
  const reference = str(raw.referenciaDocumento, 80, "Referência do comprovativo")
  return {
    doador: {
      anonimo: anonymous,
      tipo: donorType,
      nome: anonymous ? "Anónimo" : str(raw.nomeDoador, 140, "Nome do doador", true),
      email: anonymous ? "" : optionalEmail(raw.emailDoador),
      telefone: anonymous ? "" : str(raw.telefoneDoador, 40, "Telefone"),
    },
    origem: str(raw.origem, 100, "Origem"),
    finalidade: str(raw.finalidade, 160, "Finalidade"),
    referenciaDocumento: reference,
    observacoes: str(raw.observacoes, 1000, "Observações"),
    itens: lines,
  }
}