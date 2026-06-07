import { getChildActivities } from "@/lib/child-activities"
import { getCardFrozen } from "@/lib/card-freeze"
import { formatCardNumberDisplay } from "@/lib/card-display"
import { sql } from "@/lib/db"
import type {
  ChildPortfolio,
  ChildProfile,
  SpendingData,
  Transaction,
} from "@/lib/api-client"

const CATEGORY_META: Record<string, { name: string; icon: string }> = {
  food: { name: "Food", icon: "🍕" },
  transport: { name: "Transport", icon: "🚌" },
  school: { name: "School", icon: "📚" },
  entertainment: { name: "Fun", icon: "🎬" },
  gaming: { name: "Gaming", icon: "🎮" },
  other: { name: "Other", icon: "🛍️" },
}

export async function buildChildProfile(childId: string): Promise<ChildProfile | null> {
  let rows: Array<{
    id: string
    name: string
    card_last_four: string
    card_number?: string | null
    xp_balance: number | null
  }> = []

  try {
    rows = (await sql`
      SELECT c.id, c.name, c.card_last_four, c.card_number, w.xp_balance
      FROM children c
      LEFT JOIN wallets w ON w.child_id = c.id
      WHERE c.id = ${childId}
    `) as typeof rows
  } catch {
    rows = (await sql`
      SELECT c.id, c.name, c.card_last_four, w.xp_balance
      FROM children c
      LEFT JOIN wallets w ON w.child_id = c.id
      WHERE c.id = ${childId}
    `) as typeof rows
  }

  if (!rows[0]) return null

  let lockedInvestmentPc = 0
  try {
    const lock = (await sql`
      SELECT locked_investment_pc FROM wallets WHERE child_id = ${childId}
    `) as Array<{ locked_investment_pc: number }>
    lockedInvestmentPc = Number(lock[0]?.locked_investment_pc ?? 0)
  } catch {
    // optional column
  }

  const isFrozen = await getCardFrozen(childId)

  return {
    id: rows[0].id,
    name: rows[0].name,
    balance: Number(rows[0].xp_balance ?? 0),
    cardNumber: formatCardNumberDisplay(rows[0].card_number, rows[0].card_last_four),
    isFrozen,
    lockedInvestmentPc,
  }
}

export async function buildSpendingToday(childId: string): Promise<SpendingData> {
  let limit = 50
  let allowed: string[] = ["food", "transport"]

  try {
    const rules = (await sql`
      SELECT daily_limit_pc, allowed_categories
      FROM spending_rules
      WHERE child_id = ${childId}
      LIMIT 1
    `) as Array<{ daily_limit_pc: number; allowed_categories: string[] | null }>
    if (rules[0]) {
      limit = Number(rules[0].daily_limit_pc) || 50
      allowed = rules[0].allowed_categories ?? allowed
    }
  } catch {
    // spending_rules may be missing
  }

  const spent = (await sql`
    SELECT COALESCE(SUM(amount_pc), 0) AS total
    FROM transaction_decisions
    WHERE child_id = ${childId}
      AND decision = 'approved'
      AND decided_at >= now() - interval '24 hours'
  `) as Array<{ total: number }>

  const categories = allowed.map((id) => {
    const meta = CATEGORY_META[id.toLowerCase()] ?? CATEGORY_META.other
    return { name: meta.name, icon: meta.icon }
  })

  return {
    used: Number(spent[0]?.total ?? 0),
    limit,
    categories: categories.length > 0 ? categories : [{ name: "Spending", icon: "🛍️" }],
  }
}

export async function buildChildTransactions(
  childId: string,
  limit: number
): Promise<Transaction[]> {
  const activities = await getChildActivities(childId, limit)
  return activities.map((a) => ({
    id: a.id,
    merchant: a.merchant,
    category: a.category,
    categoryIcon: a.categoryIcon,
    amount: a.amount,
    direction: a.direction,
    time: a.time,
    status: a.status,
  }))
}

export async function buildChildPortfolio(childId: string): Promise<ChildPortfolio> {
  const wallet = (await sql`
    SELECT xp_balance FROM wallets WHERE child_id = ${childId}
  `) as Array<{ xp_balance: number }>

  let lockedInvestmentPc = 0
  try {
    const lock = (await sql`
      SELECT locked_investment_pc FROM wallets WHERE child_id = ${childId}
    `) as Array<{ locked_investment_pc: number }>
    lockedInvestmentPc = Number(lock[0]?.locked_investment_pc ?? 0)
  } catch {
    // optional
  }

  const holdings = (await sql`
    SELECT p.company_id, p.shares, p.avg_buy_price, c.current_price
    FROM portfolio p
    JOIN companies c ON c.id = p.company_id
    WHERE p.child_id = ${childId} AND p.shares > 0
  `) as Array<{
    company_id: string
    shares: number
    avg_buy_price: number
    current_price: number
  }>

  let totalInvested = 0
  let portfolioValue = 0
  const mapped = holdings.map((h) => {
    const shares = Number(h.shares)
    const avgPrice = Number(h.avg_buy_price)
    const price = Number(h.current_price)
    totalInvested += avgPrice * shares
    portfolioValue += price * shares
    return {
      companyId: h.company_id,
      shares,
      avgPrice,
    }
  })

  return {
    holdings: mapped,
    totalInvested: Math.round(totalInvested),
    portfolioValue: Math.round(portfolioValue),
    balance: Number(wallet[0]?.xp_balance ?? 0),
    lockedInvestmentPc,
  }
}
