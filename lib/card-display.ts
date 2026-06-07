/** Format stored digits (or legacy last-four) for display on the virtual card. */
export function formatCardNumberDisplay(
  cardNumber: string | null | undefined,
  cardLastFour?: string | null
): string {
  const digits = (cardNumber ?? "").replace(/\D/g, "")
  if (digits.length >= 8) {
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim()
  }
  const last = (cardLastFour ?? digits).replace(/\D/g, "").slice(-4)
  if (last.length === 4) {
    return `•••• •••• •••• ${last}`
  }
  return cardNumber?.trim() || "•••• •••• •••• 0000"
}

/** Mask for parent lists (last four only). */
export function maskCardNumber(
  cardNumber: string | null | undefined,
  cardLastFour?: string | null
): string {
  const digits = (cardNumber ?? "").replace(/\D/g, "")
  const last =
    cardLastFour?.replace(/\D/g, "").slice(-4) ||
    digits.slice(-4) ||
    "0000"
  return `**** ${last}`
}
