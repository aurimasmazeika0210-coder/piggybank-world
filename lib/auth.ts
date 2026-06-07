import { sql } from "@/lib/db"
import { cookies } from "next/headers"
import {
  defaultChildCardLimits,
  type ChildCardLimits,
} from "@/lib/card-limits"

export type { ChildCardLimits } from "@/lib/card-limits"
export { defaultChildCardLimits } from "@/lib/card-limits"

const SESSION_COOKIE = "session_id"
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export interface Parent {
  id: string
  name: string
  email: string
  created_at?: Date
}

export interface Child {
  id: string
  parent_id: string
  name: string
  surname?: string
  age: number
  avatar_emoji: string
  card_last_four: string
  login_code?: string
  color: string
  created_at?: Date
}

const CHILD_SELECT_BASE =
  "id, parent_id, name, age, avatar_emoji, card_last_four, color, created_at"

const CHILD_SELECT_EXTENDED = `${CHILD_SELECT_BASE}, surname, login_code`

async function fetchChildById(childId: string): Promise<Child | null> {
  try {
    const rows = (await sql`
      SELECT ${sql.unsafe(CHILD_SELECT_EXTENDED)}
      FROM children
      WHERE id = ${childId}
    `) as Child[]
    return rows[0] ?? null
  } catch {
    const rows = (await sql`
      SELECT ${sql.unsafe(CHILD_SELECT_BASE)}
      FROM children
      WHERE id = ${childId}
    `) as Child[]
    return rows[0] ?? null
  }
}

async function fetchAllChildIds(): Promise<string[]> {
  const rows = (await sql`SELECT id FROM children`) as Array<{ id: string }>
  return rows.map((r) => r.id)
}

export const LOGIN_OTP_TTL_SECONDS = 60

function isValidLoginCode(code: string | null | undefined): code is string {
  return typeof code === "string" && /^\d{6}$/.test(code)
}

export type ChildLoginOtp = {
  code: string
  expiresIn: number
  expiresAt: string
}

/** Unix time window index — same value for the whole 60s period (survives page refresh). */
export function getOtpSlot(timeMs = Date.now()): number {
  return Math.floor(timeMs / (LOGIN_OTP_TTL_SECONDS * 1000))
}

function getSlotExpiry(slot: number): Date {
  return new Date((slot + 1) * LOGIN_OTP_TTL_SECONDS * 1000)
}

function hashToSixDigits(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0
  }
  return String(Math.abs(h) % 1000000).padStart(6, "0")
}

/** Deterministic 6-digit code for a child in a given 60s window. */
export function computeChildOtp(childId: string, slot = getOtpSlot()): string {
  return hashToSixDigits(`${childId}:${slot}`)
}

async function isOtpConsumedForSlot(childId: string, slot: number): Promise<boolean> {
  try {
    const rows = (await sql`
      SELECT otp_consumed_slot FROM children WHERE id = ${childId}
    `) as Array<{ otp_consumed_slot: number | string | null }>
    if (rows[0]?.otp_consumed_slot == null) return false
    return Number(rows[0].otp_consumed_slot) === slot
  } catch {
    return false
  }
}

async function markOtpConsumed(childId: string, slot: number): Promise<void> {
  try {
    await sql`
      UPDATE children SET otp_consumed_slot = ${slot} WHERE id = ${childId}
    `
  } catch {
    // optional column
  }
}

async function syncOtpToDb(childId: string, slot: number, code: string): Promise<void> {
  const expiresAt = getSlotExpiry(slot)
  try {
    await sql`
      UPDATE children
      SET
        login_code = ${code},
        login_otp_slot = ${slot},
        login_code_expires_at = ${expiresAt.toISOString()}
      WHERE id = ${childId}
    `
  } catch {
    try {
      await sql`UPDATE children SET login_code = ${code} WHERE id = ${childId}`
    } catch {
      // columns may be missing until migration runs
    }
  }
}

/** Current OTP for display — stable until the 60s window ends (not regenerated on refresh). */
export async function getChildLoginOtp(childId: string): Promise<ChildLoginOtp> {
  const slot = getOtpSlot()
  const code = computeChildOtp(childId, slot)
  const expiresAt = getSlotExpiry(slot)
  const expiresIn = Math.max(
    1,
    Math.ceil((expiresAt.getTime() - Date.now()) / 1000)
  )

  await syncOtpToDb(childId, slot, code)

  return { code, expiresIn, expiresAt: expiresAt.toISOString() }
}

function otpMatchesChild(childId: string, code: string): boolean {
  const slot = getOtpSlot()
  return (
    computeChildOtp(childId, slot) === code ||
    computeChildOtp(childId, slot - 1) === code
  )
}

/** Validates OTP for the current window; each code works once per window. */
export async function consumeChildLoginOtp(code: string): Promise<Child | null> {
  const normalized = code.trim()
  if (!isValidLoginCode(normalized)) return null

  const slot = getOtpSlot()
  const childIds = await fetchAllChildIds()

  for (const childId of childIds) {
    if (!otpMatchesChild(childId, normalized)) continue
    if (await isOtpConsumedForSlot(childId, slot)) continue
    await markOtpConsumed(childId, slot)
    await syncOtpToDb(childId, slot, normalized)
    const child = await fetchChildById(childId)
    if (child) return child
  }

  return null
}

const CHILD_COLORS = [
  "from-pink-400 to-purple-500",
  "from-blue-400 to-cyan-500",
  "from-amber-400 to-orange-500",
  "from-emerald-400 to-teal-500",
  "from-violet-400 to-indigo-500",
  "from-rose-400 to-orange-400",
]

/** New children: no PiggyCoins/XP; trusty score starts in good standing (0–100). */
export const NEW_CHILD_STARTING_BALANCE = 0
export const NEW_CHILD_STARTING_TRUSTY_SCORE = 75

export async function hashPassword(password: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(password)
  )
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

async function setSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export async function createSession(
  userId: string,
  userType: "parent" | "child"
): Promise<string> {
  const rows = (await sql`
    INSERT INTO sessions (user_id, user_type)
    VALUES (${userId}, ${userType})
    RETURNING id
  `) as Array<{ id: string }>
  const sessionId = rows[0].id
  await setSessionCookie(sessionId)
  return sessionId
}

export async function getSession(): Promise<{
  userId: string
  userType: "parent" | "child"
} | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (!sessionId) return null

  const rows = (await sql`
    SELECT user_id, user_type FROM sessions
    WHERE id = ${sessionId} AND expires_at > now()
  `) as Array<{ user_id: string; user_type: "parent" | "child" }>

  if (!rows[0]) return null
  return { userId: rows[0].user_id, userType: rows[0].user_type }
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  if (sessionId) {
    await sql`DELETE FROM sessions WHERE id = ${sessionId}`
  }
  cookieStore.delete(SESSION_COOKIE)
}

export async function signupParent(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const existing = (await sql`
    SELECT id FROM parents WHERE email = ${email.toLowerCase().trim()}
  `) as Array<{ id: string }>
  if (existing[0]) {
    return { success: false, error: "Email already registered" }
  }

  const passwordHash = await hashPassword(password)
  const parents = (await sql`
    INSERT INTO parents (name, email, password_hash)
    VALUES (${name.trim()}, ${email.toLowerCase().trim()}, ${passwordHash})
    RETURNING id
  `) as Array<{ id: string }>

  await createSession(parents[0].id, "parent")
  return { success: true }
}

export async function loginParent(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  const rows = (await sql`
    SELECT id, password_hash FROM parents WHERE email = ${email.toLowerCase().trim()}
  `) as Array<{ id: string; password_hash: string }>

  if (!rows[0]) {
    return { success: false, error: "Invalid email or password" }
  }

  const passwordHash = await hashPassword(password)
  if (passwordHash !== rows[0].password_hash) {
    return { success: false, error: "Invalid email or password" }
  }

  await createSession(rows[0].id, "parent")
  return { success: true }
}

export async function loginChild(childId: string): Promise<void> {
  await createSession(childId, "child")
}

export async function getChildren(parentId: string): Promise<Child[]> {
  try {
    return (await sql`
      SELECT ${sql.unsafe(CHILD_SELECT_EXTENDED)}
      FROM children
      WHERE parent_id = ${parentId}
      ORDER BY created_at ASC
    `) as Child[]
  } catch {
    return (await sql`
      SELECT ${sql.unsafe(CHILD_SELECT_BASE)}
      FROM children
      WHERE parent_id = ${parentId}
      ORDER BY created_at ASC
    `) as Child[]
  }
}

export async function addChild(
  parentId: string,
  name: string,
  age: number,
  avatarEmoji: string,
  options?: {
    surname?: string
    password?: string
    cardNumber?: string
    cardHolder?: string
    cardCvv?: string
    cardExpiry?: string
  }
): Promise<Child> {
  const existing = await getChildren(parentId)
  const cardDigits = options?.cardNumber?.replace(/\D/g, "") ?? ""
  const cardLastFour =
    cardDigits.slice(-4) || String(Math.floor(1000 + Math.random() * 9000))
  const cardNumberStored = cardDigits.length >= 4 ? cardDigits : null
  const color = CHILD_COLORS[existing.length % CHILD_COLORS.length]
  const surname = options?.surname?.trim() ?? ""
  const passwordHash = options?.password
    ? await hashPassword(options.password)
    : null
  let rows: Child[]
  try {
    rows = (await sql`
      INSERT INTO children (
        parent_id, name, surname, age, avatar_emoji, card_last_four, password_hash, color,
        card_number, card_holder_name, card_cvv, card_expiry
      )
      VALUES (
        ${parentId}, ${name.trim()}, ${surname}, ${age}, ${avatarEmoji}, ${cardLastFour},
        ${passwordHash}, ${color},
        ${cardNumberStored},
        ${options?.cardHolder ?? null},
        ${options?.cardCvv ?? null},
        ${options?.cardExpiry ?? null}
      )
      RETURNING ${sql.unsafe(CHILD_SELECT_BASE)}
    `) as Child[]
  } catch {
    rows = (await sql`
      INSERT INTO children (
        parent_id, name, age, avatar_emoji, card_last_four, color,
        card_number, card_holder_name, card_cvv, card_expiry
      )
      VALUES (
        ${parentId}, ${name.trim()}, ${age}, ${avatarEmoji}, ${cardLastFour}, ${color},
        ${cardNumberStored},
        ${options?.cardHolder ?? null},
        ${options?.cardCvv ?? null},
        ${options?.cardExpiry ?? null}
      )
      RETURNING ${sql.unsafe(CHILD_SELECT_BASE)}
    `) as Child[]
    rows[0] = { ...rows[0], surname }
  }

  const child = rows[0]

  try {
    await sql`
      INSERT INTO wallets (child_id, xp_balance, trusty_score, card_frozen)
      VALUES (${child.id}, 0, ${NEW_CHILD_STARTING_TRUSTY_SCORE}, false)
    `
  } catch {
    await sql`
      INSERT INTO wallets (child_id, xp_balance, trusty_score)
      VALUES (${child.id}, 0, ${NEW_CHILD_STARTING_TRUSTY_SCORE})
    `
  }

  await sql`
    INSERT INTO spending_rules (child_id, parent_id, daily_limit_pc, allowed_categories)
    VALUES (${child.id}, ${parentId}, 50, ${["food", "transport"]})
  `

  try {
    await sql`
      INSERT INTO dividend_settings (child_id, parent_id)
      VALUES (${child.id}, ${parentId})
    `
  } catch {
    try {
      await sql`INSERT INTO dividend_settings (child_id) VALUES (${child.id})`
    } catch {
      // dividend_settings schema may differ; child row still created
    }
  }

  return child
}

export async function getParentBySession(): Promise<Parent | null> {
  const session = await getSession()
  if (!session || session.userType !== "parent") return null

  const rows = (await sql`
    SELECT id, name, email, created_at FROM parents WHERE id = ${session.userId}
  `) as Parent[]

  return rows[0] ?? null
}

export async function getChildByPin(pin: string): Promise<Child | null> {
  const rows = (await sql`
    SELECT id, parent_id, name, age, avatar_emoji, card_last_four, color, created_at
    FROM children
    WHERE card_last_four = ${pin}
  `) as Child[]
  return rows[0] ?? null
}

export async function deleteParentAccount(parentId: string): Promise<void> {
  await sql`DELETE FROM parents WHERE id = ${parentId}`
}

const DEFAULT_CATEGORY_IDS = ["food", "transport", "school", "entertainment", "gaming", "other"] as const

function limitsFromRow(row: {
  daily_limit_pc: number
  allowed_categories: string[] | null
  limits_config: ChildCardLimits | string | null
}): ChildCardLimits {
  const defaults = defaultChildCardLimits()
  let config: Partial<ChildCardLimits> | null = null
  if (row.limits_config) {
    config =
      typeof row.limits_config === "string"
        ? (JSON.parse(row.limits_config) as Partial<ChildCardLimits>)
        : row.limits_config
  }

  const allowed = new Set(
    (row.allowed_categories ?? []).map((c) => c.toLowerCase())
  )

  const categories = defaults.categories.map((cat) => {
    const saved = config?.categories?.find((c) => c.id === cat.id)
    if (saved) return { ...cat, enabled: saved.enabled, dailyLimit: saved.dailyLimit }
    if (allowed.size > 0) {
      return { ...cat, enabled: allowed.has(cat.id) }
    }
    return cat
  })

  return {
    dailyCap: config?.dailyCap ?? Number(row.daily_limit_pc) ?? defaults.dailyCap,
    perTransactionCap: config?.perTransactionCap ?? defaults.perTransactionCap,
    categories,
    schoolDaysOnly: config?.schoolDaysOnly ?? defaults.schoolDaysOnly,
    approvalThreshold: config?.approvalThreshold ?? defaults.approvalThreshold,
  }
}

export async function getChildSpendingLimits(
  parentId: string,
  childId: string
): Promise<ChildCardLimits | null> {
  const owned = (await sql`
    SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parentId}
  `) as Array<{ id: string }>
  if (!owned[0]) return null

  try {
    const rows = (await sql`
      SELECT daily_limit_pc, allowed_categories, limits_config
      FROM spending_rules
      WHERE child_id = ${childId} AND parent_id = ${parentId}
    `) as Array<{
      daily_limit_pc: number
      allowed_categories: string[] | null
      limits_config: ChildCardLimits | string | null
    }>

    if (!rows[0]) return defaultChildCardLimits()
    return limitsFromRow(rows[0])
  } catch {
    const rows = (await sql`
      SELECT daily_limit_pc, allowed_categories
      FROM spending_rules
      WHERE child_id = ${childId} AND parent_id = ${parentId}
    `) as Array<{ daily_limit_pc: number; allowed_categories: string[] | null }>
    if (!rows[0]) return defaultChildCardLimits()
    return limitsFromRow({ ...rows[0], limits_config: null })
  }
}

export async function updateChildSpendingLimits(
  parentId: string,
  childId: string,
  limits: ChildCardLimits
): Promise<boolean> {
  const owned = (await sql`
    SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parentId}
  `) as Array<{ id: string }>
  if (!owned[0]) return false

  const enabledCategories = limits.categories
    .filter((c) => c.enabled)
    .map((c) => c.id)
    .filter((id) => DEFAULT_CATEGORY_IDS.includes(id as (typeof DEFAULT_CATEGORY_IDS)[number]))

  const configPayload = {
    dailyCap: limits.dailyCap,
    perTransactionCap: limits.perTransactionCap,
    categories: limits.categories.map(({ id, enabled, dailyLimit }) => ({
      id,
      enabled,
      dailyLimit,
    })),
    schoolDaysOnly: limits.schoolDaysOnly,
    approvalThreshold: limits.approvalThreshold,
  }

  try {
    const updated = (await sql`
      UPDATE spending_rules
      SET
        daily_limit_pc = ${limits.dailyCap},
        allowed_categories = ${enabledCategories},
        limits_config = ${sql.json(configPayload)}
      WHERE child_id = ${childId} AND parent_id = ${parentId}
      RETURNING child_id
    `) as Array<{ child_id: string }>
    if (updated[0]) return true
  } catch {
    // limits_config column may not exist yet
  }

  try {
    const updated = (await sql`
      UPDATE spending_rules
      SET
        daily_limit_pc = ${limits.dailyCap},
        allowed_categories = ${enabledCategories}
      WHERE child_id = ${childId} AND parent_id = ${parentId}
      RETURNING child_id
    `) as Array<{ child_id: string }>
    if (updated[0]) return true
  } catch (e) {
    console.error("[updateChildSpendingLimits UPDATE]", e)
    return false
  }

  try {
    await sql`
      INSERT INTO spending_rules (child_id, parent_id, daily_limit_pc, allowed_categories)
      VALUES (${childId}, ${parentId}, ${limits.dailyCap}, ${enabledCategories})
    `
    return true
  } catch (e) {
    console.error("[updateChildSpendingLimits INSERT]", e)
    return false
  }
}

export async function deleteChild(parentId: string, childId: string): Promise<boolean> {
  const owned = (await sql`
    SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parentId}
  `) as Array<{ id: string }>
  if (!owned[0]) return false

  await sql`DELETE FROM sessions WHERE user_id = ${childId} AND user_type = 'child'`
  try {
    await sql`DELETE FROM child_notifications WHERE child_id = ${childId}`
  } catch {
    // optional table
  }
  try {
    await sql`DELETE FROM child_activities WHERE child_id = ${childId}`
  } catch {
    // optional table
  }
  try {
    await sql`DELETE FROM dividends_paid WHERE child_id = ${childId}`
  } catch {
    // optional table
  }
  await sql`DELETE FROM portfolio WHERE child_id = ${childId}`
  await sql`DELETE FROM transaction_decisions WHERE child_id = ${childId}`
  await sql`DELETE FROM lesson_progress WHERE child_id = ${childId}`
  await sql`DELETE FROM user_challenges WHERE child_id = ${childId}`
  await sql`DELETE FROM spending_rules WHERE child_id = ${childId}`
  try {
    await sql`DELETE FROM dividend_settings WHERE child_id = ${childId}`
  } catch {
    // optional table
  }
  await sql`DELETE FROM wallets WHERE child_id = ${childId}`

  const rows = (await sql`
    DELETE FROM children WHERE id = ${childId} AND parent_id = ${parentId}
    RETURNING id
  `) as Array<{ id: string }>
  return rows.length > 0
}
