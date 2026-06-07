// Types for API responses
export interface Transaction {
  id: string
  merchant: string
  category: string
  categoryIcon: string
  amount: number
  direction?: "in" | "out"
  time: string
  status: "approved" | "blocked" | "completed"
}

export interface SavingsGoal {
  id: string
  emoji: string
  name: string
  target: number
  saved: number
  type?: "personal" | "parent_task"
  rewardPc?: number
  rewardXp?: number
  description?: string
  status?: "active" | "completed"
}

export interface SpendingCategory {
  name: string
  icon: string
}

export interface SpendingData {
  used: number
  limit: number
  categories: SpendingCategory[]
}

export interface ChildProfile {
  id: string
  name: string
  balance: number
  cardNumber: string
  isFrozen: boolean
  lockedInvestmentPc?: number
}

/**
 * Fetches wallet transactions for a child
 * @param childId - The child's unique identifier
 * @param limit - Maximum number of transactions to fetch
 */
export async function getWalletTransactions(
  childId: string,
  limit: number = 10
): Promise<Transaction[]> {
  const res = await fetch(`/api/children/${childId}/activity?limit=${limit}`)
  if (!res.ok) {
    const fallback = await fetch(`/api/children/${childId}/transactions?limit=${limit}`)
    if (!fallback.ok) throw new Error("Failed to fetch transactions")
    return fallback.json()
  }
  return res.json()
}

export async function getChildGoals(childId: string): Promise<SavingsGoal[]> {
  const res = await fetch(`/api/children/${childId}/goals`)
  if (!res.ok) throw new Error("Failed to fetch goals")
  const data = await res.json()
  return data.goals
}

export async function createChildGoal(
  childId: string,
  input: { emoji: string; name: string; target: number; targetPc?: number }
): Promise<SavingsGoal> {
  const res = await fetch(`/api/children/${childId}/goals`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emoji: input.emoji,
      name: input.name,
      targetPc: input.targetPc ?? input.target,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to create goal")
  }
  return data.goal
}

export async function completeParentTask(
  childId: string,
  goalId: string
): Promise<{ newBalance: number; goal: SavingsGoal; rewardPc: number }> {
  const res = await fetch(`/api/children/${childId}/goals/${goalId}/complete`, {
    method: "POST",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to complete task")
  }
  return data
}

export async function contributeToGoal(
  childId: string,
  goalId: string,
  amount: number
): Promise<{ newBalance: number }> {
  const res = await fetch(`/api/children/${childId}/goals/${goalId}/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goalId, amount }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to contribute")
  }
  return data
}

export async function setParentCardFrozen(childId: string, frozen: boolean) {
  const res = await fetch(`/api/parent/children/${childId}/freeze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frozen }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to update card")
  }
  return data
}

/**
 * Fetches today's spending data for a child
 * @param childId - The child's unique identifier
 */
export async function getSpendingToday(childId: string): Promise<SpendingData> {
  const res = await fetch(`/api/children/${childId}/spending/today`)
  if (!res.ok) throw new Error("Failed to fetch spending data")
  return res.json()
}

/**
 * Fetches a child's profile including balance
 * @param childId - The child's unique identifier
 */
export async function getLessonProgress(childId: string): Promise<{
  stars: number[]
  investmentXp: number
  lessonCount: number
}> {
  const res = await fetch(`/api/children/${childId}/lessons`, { cache: "no-store" })
  if (!res.ok) throw new Error("Failed to load lesson progress")
  return res.json()
}

export async function saveLessonProgress(
  childId: string,
  lessonIndex: number,
  stars: number
): Promise<{
  stars: number[]
  investmentXp: number
  rewardPc: number
  newBalance: number
}> {
  const res = await fetch(`/api/children/${childId}/lessons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lessonIndex, stars }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to save lesson")
  }
  return data
}

export async function getChildProfile(childId: string): Promise<ChildProfile> {
  const res = await fetch(`/api/children/${childId}/profile`)
  if (!res.ok) throw new Error("Failed to fetch profile")
  return res.json()
}

/**
 * Freezes or unfreezes a child's card
 * @param childId - The child's unique identifier
 * @param frozen - Whether the card should be frozen
 */
export async function setCardFrozen(
  childId: string,
  frozen: boolean
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/children/${childId}/card/freeze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ frozen }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to update card status")
  }
  return data
}

export async function getMarketPrices() {
  const res = await fetch("/api/market/prices")
  if (!res.ok) throw new Error("Failed to fetch market prices")
  return res.json()
}

export async function getChallenges(childId: string) {
  const res = await fetch(`/api/challenges/${childId}`)
  if (!res.ok) throw new Error("Failed to fetch challenges")
  return res.json()
}

export async function requestPinReveal(childId: string): Promise<void> {
  const res = await fetch(`/api/children/${childId}/pin-reveal/request`, { method: "POST" })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(typeof data.error === "string" ? data.error : "Failed to notify parent")
  }
}

export interface ChildPortfolio {
  holdings: Array<{ companyId: string; shares: number; avgPrice: number }>
  totalInvested: number
  portfolioValue: number
  balance: number
  lockedInvestmentPc: number
}

export interface MarketCompany {
  id: string
  name: string
  icon: string | null
  currentPrice: number
  change24h: number
  history7d: Array<{ price: number; date: string }>
}

export async function getChildPortfolio(childId: string): Promise<ChildPortfolio> {
  const res = await fetch(`/api/children/${childId}/portfolio`)
  if (!res.ok) throw new Error("Failed to fetch portfolio")
  return res.json()
}

export async function buyShares(
  childId: string,
  companyId: string,
  quantity: number
): Promise<{ success: boolean; newBalance?: number }> {
  const res = await fetch("/api/portfolio/buy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId, companyId, quantity }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to buy shares")
  }
  return data
}

export interface ChildNotification {
  id: number
  title: string
  body: string
  isRead: boolean
  type: string
  createdAt: string
}

export async function getChildNotifications(childId: string): Promise<ChildNotification[]> {
  const res = await fetch(`/api/children/${childId}/notifications`, { cache: "no-store" })
  if (!res.ok) return []
  return res.json()
}

export async function markChildNotificationsRead(childId: string): Promise<void> {
  const res = await fetch(`/api/children/${childId}/notifications/read-all`, {
    method: "POST",
  })
  if (!res.ok) throw new Error("Failed to mark notifications as read")
}

export async function sellShares(childId: string, companyId: string, quantity: number) {
  const res = await fetch("/api/portfolio/sell", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ childId, companyId, quantity }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "Failed to sell shares")
  }
  return data
}
