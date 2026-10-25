/**
 * Transactional, idempotent material reception confirmation.
 *
 * Separated from the HTTP handler for integration tests against the real
 * Firestore Emulator. Never call for real donors without authorised access.
 */
import { openMaterialReception, sealStockItem } from "./private-records.mjs"

export async function confirmMaterialReceipt(db, id, actorUid, now = () => new Date().toISOString()) {
  const ref = db.collection("area_material_receptions").doc(id)
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref)
    if (!snapshot.exists) return "not-found"
    const record = openMaterialReception(snapshot.data(), ref.path)
    if (record.estado === "confirmada") return "already-confirmed"
    if (record.estado !== "pendente") return "invalid-state"
    const lines = record.itens
    if (!Array.isArray(lines) || lines.length < 1 || lines.length > 50) return "invalid-state"

    // Firestore transaction's callback can be retried. All document IDs are
    // deterministic for this reception; the receipt state is the source of truth.
    const stamp = now()
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!Number.isFinite(line.quantidade) || line.quantidade <= 0) return "invalid-state"
      const lot = db.collection("area_material_stock_lots").doc(ref.id + "-" + i)
      const movement = db.collection("area_material_stock_movements").doc(ref.id + "-entrada-" + i)
      transaction.create(lot, {
        ...sealStockItem(line, lot.path),
        rececaoId: ref.id,
        linha: i,
        atualizadoEm: stamp,
      })
      transaction.create(movement, {
        tipo: "entrada",
        rececaoId: ref.id,
        loteId: lot.id,
        quantidade: line.quantidade,
        unidade: line.unidade,
        criadoEm: stamp,
        criadoPor: actorUid,
      })
    }
    transaction.update(ref, {
      estado: "confirmada",
      confirmadoEm: stamp,
      confirmadoPor: actorUid,
    })
    return "confirmed"
  })
}
