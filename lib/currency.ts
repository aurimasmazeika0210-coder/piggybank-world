/** 1 PiggyCoin = €0.10 */
export const PC_TO_EUR = 0.1

export function piggyCoinsToEuros(piggyCoins: number): number {
  return piggyCoins * PC_TO_EUR
}

export function formatEuros(piggyCoins: number): string {
  return `€${piggyCoinsToEuros(piggyCoins).toFixed(2)}`
}

export function formatEurosFromPc(piggyCoins: number): string {
  return formatEuros(piggyCoins)
}
