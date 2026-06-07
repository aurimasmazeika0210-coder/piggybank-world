import { sql } from "@/lib/db"

const DEFAULT_QUIZ_REWARD_PC = 10

export async function getQuizRewardPc(childId: string): Promise<number> {
  try {
    const rows = (await sql`
      SELECT quiz_reward_pc FROM children WHERE id = ${childId}
    `) as Array<{ quiz_reward_pc: number | null }>
    const value = Number(rows[0]?.quiz_reward_pc)
    if (Number.isFinite(value) && value >= 0) return Math.round(value)
  } catch {
    // column may not exist yet
  }
  return DEFAULT_QUIZ_REWARD_PC
}

export async function getQuizRewardsForParent(
  parentId: string
): Promise<Record<string, number>> {
  const rewards: Record<string, number> = {}
  try {
    const rows = (await sql`
      SELECT id, quiz_reward_pc
      FROM children
      WHERE parent_id = ${parentId}
    `) as Array<{ id: string; quiz_reward_pc: number | null }>
    for (const row of rows) {
      const value = Number(row.quiz_reward_pc)
      rewards[row.id] =
        Number.isFinite(value) && value >= 0 ? Math.round(value) : DEFAULT_QUIZ_REWARD_PC
    }
  } catch {
    const rows = (await sql`
      SELECT id FROM children WHERE parent_id = ${parentId}
    `) as Array<{ id: string }>
    for (const row of rows) {
      rewards[row.id] = DEFAULT_QUIZ_REWARD_PC
    }
  }
  return rewards
}

export async function saveQuizRewardsForParent(
  parentId: string,
  rewards: Record<string, number>
): Promise<void> {
  for (const [childId, raw] of Object.entries(rewards)) {
    const amount = Math.max(0, Math.min(500, Math.round(Number(raw))))
    if (!Number.isFinite(amount)) continue

    const owned = (await sql`
      SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parentId}
    `) as Array<{ id: string }>
    if (!owned[0]) continue

    try {
      await sql`
        UPDATE children SET quiz_reward_pc = ${amount} WHERE id = ${childId}
      `
    } catch {
      // column missing — skip
    }
  }
}
