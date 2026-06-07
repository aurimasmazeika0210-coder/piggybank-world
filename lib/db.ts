import postgres from "postgres"

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new Error("DATABASE_URL is not set in .env.local")
  }
  if (url.includes("[YOUR-PASSWORD]")) {
    throw new Error(
      "DATABASE_URL still contains [YOUR-PASSWORD]. Use the Session pooler URI from Supabase → Project Settings → Database."
    )
  }
  return url
}

/**
 * Supabase on Windows: prefer the **Session pooler** URI from the dashboard.
 * Direct `db.*.supabase.co` is often IPv6-only and fails with ENOTFOUND on Node.
 */
export const sql = postgres(getDatabaseUrl(), {
  ssl: "require",
  prepare: false,
  max: 10,
})

// Types for database entities
export interface Company {
  id: string
  name: string
  starting_price: number
  current_price: number
  icon: string | null
  created_at: Date
  updated_at: Date
}

export interface StockPriceHistory {
  id: number
  company_id: string
  price: number
  change_percent: number
  recorded_at: Date
}

export interface MarketNews {
  id: number
  company_id: string
  headline: string
  change_percent: number
  is_positive: boolean
  created_at: Date
}

export interface Challenge {
  id: string
  title: string
  description: string
  icon: string | null
  xp_reward: number
  target_value: number
  challenge_type: string
  created_at: Date
}

export interface UserChallenge {
  id: number
  child_id: string
  challenge_id: string
  current_progress: number
  is_completed: boolean
  completed_at: Date | null
  created_at: Date
}

export interface Wallet {
  id: number
  child_id: string
  xp_balance: number
  trusty_score: number
  created_at: Date
  updated_at: Date
}

export interface Portfolio {
  id: number
  child_id: string
  company_id: string
  shares: number
  avg_buy_price: number
  first_purchase_at: Date
  updated_at: Date
}

export interface LessonProgress {
  id: number
  child_id: string
  lesson_id: string
  quiz_passed: boolean
  completed_at: Date | null
  created_at: Date
}

// Market simulation constants
export const MARKET_CONFIG = {
  MIN_CHANGE_PERCENT: -10,
  MAX_CHANGE_PERCENT: 15,
  MIN_PRICE_RATIO: 0.5, // Never below 50% of starting price
  NEWS_THRESHOLD_PERCENT: 5, // Generate investment news if price moves more than 5%
} as const

// Challenge types enum
export const CHALLENGE_TYPES = {
  FIRST_BUY: "first_buy",
  DIVERSIFY: "diversify",
  PROFIT: "profit",
  LESSONS: "lessons",
  HOLD_STREAK: "hold_streak",
} as const

// Event types for challenge checking
export type ChallengeEventType = "buy" | "sell" | "lesson_quiz" | "daily_check"
