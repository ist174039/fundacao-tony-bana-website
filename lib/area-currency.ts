export function normalizeStoredXofAmount(value: unknown, currency: unknown) {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount)) return 0
  // Existing AOA records were stored in cents. Preserve their nominal input value
  // when exposing them in the foundation's corrected XOF currency.
  return currency === "AOA" ? Math.round(amount / 100) : Math.round(amount)
}

export function formatXof(amount: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF", maximumFractionDigits: 0 }).format(amount)
}
