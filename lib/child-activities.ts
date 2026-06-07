import { sql } from "@/lib/db"

export type ActivityStatus = "approved" | "blocked" | "completed"

const ACTIVITY_ICONS: Record<string, string> = {
  spend: "🛍️",
  food: "🍕",
  transport: "🚌",
  education: "📚",
  gaming: "🎮",
  entertainment: "🎬",
  clothing: "👕",
  other: "🛍️",
  goal: "🎯",
  investment_buy: "📈",
  investment_sell: "📉",
  dividend: "💰",
  top_up: "💳",
  card_frozen: "❄️",
  card_unfrozen: "✅",
  lesson_reward: "🎓",
}

export async function logChildActivity(
  childId: string,
  activityType: string,
  title: string,
  amountPc: number,
  status: ActivityStatus = "completed"
): Promise<void> {
  try {
    await sql`
      INSERT INTO child_activities (child_id, activity_type, title, amount_pc, status)
      VALUES (${childId}, ${activityType}, ${title}, ${amountPc}, ${status})
    `
  } catch {
    // child_activities table may not exist until migration is run
  }
}

export interface ActivityItem {
  id: string
  childId?: string
  childName?: string
  merchant: string
  category: string
  categoryIcon: string
  amount: number
  direction: "in" | "out"
  time: string
  status: ActivityStatus
  createdAt: string
}

function directionFor(type: string): "in" | "out" {
  if (
    type === "investment_sell" ||
    type === "dividend" ||
    type === "top_up" ||
    type === "lesson_reward" ||
    type === "education"
  ) {
    return "in"
  }
  return "out"
}

function iconFor(type: string, category?: string): string {
  return ACTIVITY_ICONS[type] ?? ACTIVITY_ICONS[category?.toLowerCase() ?? ""] ?? "🪙"
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export async function getChildActivities(
  childId: string,
  limit = 20
): Promise<ActivityItem[]> {
  const items: ActivityItem[] = []

  try {
    const rows = (await sql`
      SELECT id, activity_type, title, amount_pc, status, created_at
      FROM child_activities
      WHERE child_id = ${childId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: number
      activity_type: string
      title: string
      amount_pc: number
      status: string
      created_at: string
    }>

    for (const r of rows) {
      const createdAt = new Date(r.created_at).toISOString()
      items.push({
        id: `act-${r.id}`,
        merchant: r.title,
        category: r.activity_type.replace(/_/g, " "),
        categoryIcon: iconFor(r.activity_type),
        amount: Number(r.amount_pc),
        direction: directionFor(r.activity_type),
        time: formatTime(createdAt),
        status: (r.status as ActivityStatus) ?? "completed",
        createdAt,
      })
    }
  } catch {
    // table optional
  }

  try {
    const spends = (await sql`
      SELECT id, merchant_name, category, amount_pc, decision, decided_at
      FROM transaction_decisions
      WHERE child_id = ${childId}
      ORDER BY decided_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: number
      merchant_name: string
      category: string
      amount_pc: number
      decision: string
      decided_at: string
    }>

    for (const r of spends) {
      const createdAt = new Date(r.decided_at).toISOString()
      items.push({
        id: `tx-${r.id}`,
        merchant: r.merchant_name,
        category: r.category ?? "spend",
        categoryIcon: iconFor("spend", r.category),
        amount: Number(r.amount_pc),
        direction: "out",
        time: formatTime(createdAt),
        status: r.decision === "approved" ? "approved" : "blocked",
        createdAt,
      })
    }
  } catch {
    // optional
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return items.slice(0, limit)
}

export async function getParentActivities(
  parentId: string,
  limit = 30
): Promise<Array<ActivityItem & { childName: string }>> {
  const items: Array<ActivityItem & { childName: string }> = []

  try {
    const rows = (await sql`
      SELECT a.id, a.child_id, a.activity_type, a.title, a.amount_pc, a.status, a.created_at,
             c.name as child_name
      FROM child_activities a
      JOIN children c ON c.id = a.child_id
      WHERE c.parent_id = ${parentId}
      ORDER BY a.created_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: number
      child_id: string
      activity_type: string
      title: string
      amount_pc: number
      status: string
      created_at: string
      child_name: string
    }>

    for (const r of rows) {
      const createdAt = new Date(r.created_at).toISOString()
      items.push({
        id: `act-${r.id}`,
        childId: r.child_id,
        childName: r.child_name,
        merchant: r.title,
        category: r.activity_type.replace(/_/g, " "),
        categoryIcon: iconFor(r.activity_type),
        amount: Number(r.amount_pc),
        direction: directionFor(r.activity_type),
        time: formatTime(createdAt),
        status: (r.status as ActivityStatus) ?? "completed",
        createdAt,
      })
    }
  } catch {
    // optional
  }

  try {
    const spends = (await sql`
      SELECT t.id, t.child_id, t.merchant_name, t.category, t.amount_pc, t.decision, t.decided_at,
             c.name as child_name
      FROM transaction_decisions t
      JOIN children c ON c.id = t.child_id
      WHERE c.parent_id = ${parentId}
      ORDER BY t.decided_at DESC
      LIMIT ${limit}
    `) as Array<{
      id: number
      child_id: string
      merchant_name: string
      category: string
      amount_pc: number
      decision: string
      decided_at: string
      child_name: string
    }>

    for (const r of spends) {
      const createdAt = new Date(r.decided_at).toISOString()
      items.push({
        id: `tx-${r.id}`,
        childId: r.child_id,
        childName: r.child_name,
        merchant: r.merchant_name,
        category: r.category ?? "spend",
        categoryIcon: iconFor("spend", r.category),
        amount: Number(r.amount_pc),
        direction: "out",
        time: formatTime(createdAt),
        status: r.decision === "approved" ? "approved" : "blocked",
        createdAt,
      })
    }
  } catch {
    // optional
  }

  items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  return items.slice(0, limit)
}
