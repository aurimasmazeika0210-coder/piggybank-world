import { Redis } from "@upstash/redis"

function redisConfigured(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
}

// Create a reusable Redis client (optional — streak features skip if unset)
export const redis = redisConfigured()
  ? new Redis({
      url: process.env.KV_REST_API_URL!,
      token: process.env.KV_REST_API_TOKEN!,
    })
  : null

// Redis key patterns for streak tracking
export const REDIS_KEYS = {
  // Hold streak: stores the consecutive days a user has held investments
  holdStreak: (childId: string) => `streak:hold:${childId}`,
  // Last check date: stores when we last checked for the daily streak
  lastCheckDate: (childId: string) => `streak:lastcheck:${childId}`,
  // First investment date: when the user first made an investment
  firstInvestmentDate: (childId: string) => `streak:firstinvest:${childId}`,
} as const

// Streak management functions
export async function getHoldStreak(childId: string): Promise<number> {
  if (!redis) return 0
  try {
    const streak = await redis.get<number>(REDIS_KEYS.holdStreak(childId))
    return streak ?? 0
  } catch {
    return 0
  }
}

export async function setHoldStreak(childId: string, days: number): Promise<void> {
  if (!redis) return
  try {
    await redis.set(REDIS_KEYS.holdStreak(childId), days)
  } catch {
    // optional streak storage
  }
}

export async function incrementHoldStreak(childId: string): Promise<number> {
  if (!redis) return 0
  try {
    return await redis.incr(REDIS_KEYS.holdStreak(childId))
  } catch {
    return 0
  }
}

export async function resetHoldStreak(childId: string): Promise<void> {
  if (!redis) return
  try {
    await redis.set(REDIS_KEYS.holdStreak(childId), 0)
  } catch {
    // optional
  }
}

export async function getLastCheckDate(childId: string): Promise<string | null> {
  if (!redis) return null
  try {
    return await redis.get<string>(REDIS_KEYS.lastCheckDate(childId))
  } catch {
    return null
  }
}

export async function setLastCheckDate(childId: string, date: string): Promise<void> {
  if (!redis) return
  try {
    await redis.set(REDIS_KEYS.lastCheckDate(childId), date)
  } catch {
    // optional
  }
}

export async function getFirstInvestmentDate(childId: string): Promise<string | null> {
  if (!redis) return null
  try {
    return await redis.get<string>(REDIS_KEYS.firstInvestmentDate(childId))
  } catch {
    return null
  }
}

export async function setFirstInvestmentDate(childId: string, date: string): Promise<void> {
  if (!redis) return
  try {
    await redis.setnx(REDIS_KEYS.firstInvestmentDate(childId), date)
  } catch {
    // optional
  }
}
