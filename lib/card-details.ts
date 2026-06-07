function hashDigits(input: string, length: number): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  const mod = 10 ** length
  return String(Math.abs(h) % mod).padStart(length, "0")
}

export function formatCardNumberFull(childId: string, lastFour: string): string {
  const last = (lastFour || "0000").slice(-4).padStart(4, "0")
  const p1 = hashDigits(`${childId}:n1`, 4)
  const p2 = hashDigits(`${childId}:n2`, 4)
  const p3 = hashDigits(`${childId}:n3`, 4)
  return `${p1} ${p2} ${p3} ${last}`
}

export function maskCardNumber(lastFour: string): string {
  const last = (lastFour || "0000").slice(-4)
  return `•••• •••• •••• ${last}`
}

export function getCardExpiry(): string {
  return "12/28"
}

export function getCardCvv(childId: string): string {
  return hashDigits(`${childId}:cvv`, 3)
}
