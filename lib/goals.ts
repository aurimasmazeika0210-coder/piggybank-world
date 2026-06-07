import { sql } from "@/lib/db"

export type GoalType = "personal" | "parent_task"
export type GoalStatus = "active" | "completed"

export interface ChildGoal {
  id: string
  emoji: string
  name: string
  target: number
  saved: number
  type: GoalType
  rewardPc?: number
  rewardXp?: number
  description?: string
  status: GoalStatus
}

function mapRow(r: {
  id: string | number
  emoji: string
  name: string
  target_pc: number
  saved_pc: number
  type?: string
  reward_pc?: number | null
  reward_xp?: number | null
  description?: string | null
  status?: string
}): ChildGoal {
  return {
    id: String(r.id),
    emoji: r.emoji,
    name: r.name,
    target: Number(r.target_pc),
    saved: Number(r.saved_pc),
    type: (r.type as GoalType) ?? "personal",
    rewardPc: r.reward_pc != null ? Number(r.reward_pc) : undefined,
    rewardXp: r.reward_xp != null ? Number(r.reward_xp) : undefined,
    description: r.description ?? undefined,
    status: (r.status as GoalStatus) ?? "active",
  }
}

async function queryGoalsTable(childId: string): Promise<ChildGoal[] | null> {
  try {
    const rows = (await sql`
      SELECT id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
      FROM goals
      WHERE child_id = ${childId} AND status = 'active'
      ORDER BY type DESC, created_at DESC
    `) as Array<{
      id: number
      emoji: string
      name: string
      target_pc: number
      saved_pc: number
      type: string
      reward_pc: number | null
      reward_xp: number | null
      description: string | null
      status: string
    }>
    return rows.map(mapRow)
  } catch {
    return null
  }
}

export async function getGoalsForChild(childId: string): Promise<ChildGoal[]> {
  const fromGoals = await queryGoalsTable(childId)
  if (fromGoals) return fromGoals

  try {
    const rows = (await sql`
      SELECT id, emoji, name, target_pc, saved_pc
      FROM savings_goals
      WHERE child_id = ${childId}
      ORDER BY created_at ASC
    `) as Array<{
      id: string
      emoji: string
      name: string
      target_pc: number
      saved_pc: number
    }>
    return rows.map((r) => mapRow({ ...r, type: "personal", status: "active" }))
  } catch {
    return []
  }
}

export async function createGoalForChild(
  childId: string,
  input: { emoji: string; name: string; target: number; targetPc?: number }
): Promise<ChildGoal> {
  const emoji = (input.emoji || "🎯").slice(0, 8)
  const name = input.name.trim().slice(0, 80)
  const target = Math.round(Number(input.targetPc ?? input.target))

  if (!name) throw new Error("Goal name is required")
  if (!target || target < 1 || target > 100000) {
    throw new Error("Target must be between 1 and 100000 PiggyCoins")
  }

  try {
    const rows = (await sql`
      INSERT INTO goals (child_id, emoji, name, target_pc, saved_pc, type, status)
      VALUES (${childId}, ${emoji}, ${name}, ${target}, 0, 'personal', 'active')
      RETURNING id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
    `) as Array<{
      id: number
      emoji: string
      name: string
      target_pc: number
      saved_pc: number
      type: string
      reward_pc: number | null
      reward_xp: number | null
      description: string | null
      status: string
    }>
    return mapRow(rows[0])
  } catch {
    const rows = (await sql`
      INSERT INTO savings_goals (child_id, emoji, name, target_pc, saved_pc)
      VALUES (${childId}, ${emoji}, ${name}, ${target}, 0)
      RETURNING id, emoji, name, target_pc, saved_pc
    `) as Array<{
      id: string
      emoji: string
      name: string
      target_pc: number
      saved_pc: number
    }>
    return mapRow({ ...rows[0], type: "personal", status: "active" })
  }
}

export async function createParentTaskGoal(
  parentId: string,
  input: {
    childId: string
    name: string
    description?: string
    emoji: string
    targetPc: number
    rewardPc: number
    rewardXp: number
  }
): Promise<ChildGoal> {
  const rows = (await sql`
    INSERT INTO goals (
      child_id, parent_id, emoji, name, description, target_pc, saved_pc,
      type, reward_pc, reward_xp, status
    )
    VALUES (
      ${input.childId},
      ${parentId},
      ${input.emoji},
      ${input.name.trim()},
      ${input.description?.trim() ?? ""},
      ${Math.round(input.targetPc)},
      0,
      'parent_task',
      ${Math.round(input.rewardPc)},
      ${Math.round(input.rewardXp)},
      'active'
    )
    RETURNING id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
  `) as Array<{
    id: number
    emoji: string
    name: string
    target_pc: number
    saved_pc: number
    type: string
    reward_pc: number | null
    reward_xp: number | null
    description: string | null
    status: string
  }>
  return mapRow(rows[0])
}

export async function contributeToGoalForChild(
  childId: string,
  goalId: string,
  amount: number
): Promise<{ newBalance: number; goal: ChildGoal; applied: number }> {
  const coins = Math.round(Number(amount))
  if (!coins || coins < 1) throw new Error("Amount must be at least 1 PiggyCoin")

  let goals: Array<{
    id: string | number
    emoji: string
    name: string
    target_pc: number
    saved_pc: number
    type?: string
    status?: string
  }> = []

  try {
    goals = (await sql`
      SELECT id, emoji, name, target_pc, saved_pc, type, status
      FROM goals
      WHERE id = ${goalId} AND child_id = ${childId} AND status = 'active'
    `) as typeof goals
  } catch {
    goals = (await sql`
      SELECT id, emoji, name, target_pc, saved_pc
      FROM savings_goals
      WHERE id = ${goalId} AND child_id = ${childId}
    `) as typeof goals
  }

  if (!goals[0]) throw new Error("Goal not found")
  if (goals[0].type === "parent_task") {
    throw new Error("Use Mark as Done for parent tasks")
  }

  const wallet = (await sql`
    SELECT xp_balance FROM wallets WHERE child_id = ${childId}
  `) as Array<{ xp_balance: number }>

  const balance = Number(wallet[0]?.xp_balance ?? 0)
  if (coins > balance) throw new Error("Not enough PiggyCoins in your wallet")

  const remaining = Number(goals[0].target_pc) - Number(goals[0].saved_pc)
  if (remaining <= 0) throw new Error("This goal is already complete")
  const applied = Math.min(coins, remaining)

  await sql`
    UPDATE wallets
    SET xp_balance = xp_balance - ${applied}, updated_at = NOW()
    WHERE child_id = ${childId}
  `

  let updated: Array<{
    id: string | number
    emoji: string
    name: string
    target_pc: number
    saved_pc: number
    type?: string
    reward_pc?: number | null
    reward_xp?: number | null
    description?: string | null
    status?: string
  }> = []

  try {
    updated = (await sql`
      UPDATE goals
      SET saved_pc = saved_pc + ${applied}
      WHERE id = ${goalId} AND child_id = ${childId}
      RETURNING id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
    `) as typeof updated
  } catch {
    updated = (await sql`
      UPDATE savings_goals
      SET saved_pc = saved_pc + ${applied}
      WHERE id = ${goalId} AND child_id = ${childId}
      RETURNING id, emoji, name, target_pc, saved_pc
    `) as typeof updated
  }

  const row = updated[0]
  let goal = mapRow(row)

  if (Number(row.saved_pc) >= Number(row.target_pc)) {
    try {
      const completed = (await sql`
        UPDATE goals SET status = 'completed' WHERE id = ${goalId}
        RETURNING id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
      `) as Array<typeof row>
      if (completed[0]) goal = mapRow(completed[0])
    } catch {
      // goals table may not exist
    }
  }

  const balanceRows = (await sql`
    SELECT xp_balance FROM wallets WHERE child_id = ${childId}
  `) as Array<{ xp_balance: number }>

  return {
    newBalance: Number(balanceRows[0]?.xp_balance ?? 0),
    applied,
    goal,
  }
}

export async function completeParentTaskGoal(
  childId: string,
  goalId: string
): Promise<{
  goal: ChildGoal
  newBalance: number
  parentId: string | null
  rewardPc: number
  rewardXp: number
  taskName: string
}> {
  const goals = (await sql`
    SELECT id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status, parent_id
    FROM goals
    WHERE id = ${goalId} AND child_id = ${childId} AND type = 'parent_task' AND status = 'active'
  `) as Array<{
    id: number
    emoji: string
    name: string
    target_pc: number
    saved_pc: number
    type: string
    reward_pc: number | null
    reward_xp: number | null
    description: string | null
    status: string
    parent_id: string | null
  }>

  if (!goals[0]) throw new Error("Task not found")

  const rewardPc = Math.round(Number(goals[0].reward_pc ?? 0))
  const rewardXp = Math.round(Number(goals[0].reward_xp ?? 0))

  await sql`
    UPDATE goals SET status = 'completed', saved_pc = target_pc WHERE id = ${goalId}
  `

  if (rewardPc > 0) {
    await sql`
      UPDATE wallets
      SET xp_balance = xp_balance + ${rewardPc}, updated_at = NOW()
      WHERE child_id = ${childId}
    `
  }

  const updated = (await sql`
    SELECT id, emoji, name, target_pc, saved_pc, type, reward_pc, reward_xp, description, status
    FROM goals WHERE id = ${goalId}
  `) as typeof goals

  const balanceRows = (await sql`
    SELECT xp_balance FROM wallets WHERE child_id = ${childId}
  `) as Array<{ xp_balance: number }>

  return {
    goal: mapRow(updated[0]),
    newBalance: Number(balanceRows[0]?.xp_balance ?? 0),
    parentId: goals[0].parent_id,
    rewardPc,
    rewardXp,
    taskName: goals[0].name,
  }
}
