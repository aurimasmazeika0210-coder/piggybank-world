export interface ChildCardLimits {
  dailyCap: number
  perTransactionCap: number
  categories: Array<{ id: string; enabled: boolean; dailyLimit: number }>
  schoolDaysOnly: boolean
  approvalThreshold: number
}

export function defaultChildCardLimits(): ChildCardLimits {
  return {
    dailyCap: 50,
    perTransactionCap: 15,
    categories: [
      { id: "food", enabled: true, dailyLimit: 20 },
      { id: "transport", enabled: true, dailyLimit: 10 },
      { id: "school", enabled: true, dailyLimit: 25 },
      { id: "entertainment", enabled: true, dailyLimit: 15 },
      { id: "gaming", enabled: false, dailyLimit: 0 },
      { id: "other", enabled: true, dailyLimit: 10 },
    ],
    schoolDaysOnly: true,
    approvalThreshold: 20,
  }
}
