import { NextRequest, NextResponse } from "next/server"
import { createParentTaskGoal } from "@/lib/goals"
import { createChildNotification } from "@/lib/notifications"
import { requireParentSession } from "@/lib/parent-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response

    const body = await request.json()
    const childId = body.childId as string
    const name = (body.name as string)?.trim()
    const description = (body.description as string)?.trim() ?? ""
    const emoji = (body.emoji as string) || "🎯"
    const targetPc = Math.round(Number(body.targetPc))
    const rewardPc = Math.round(Number(body.rewardPc))
    const rewardXp = Math.round(Number(body.rewardXp))

    if (!childId || !name) {
      return NextResponse.json({ error: "Child and task name are required" }, { status: 400 })
    }

    const owned = (await sql`
      SELECT id FROM children WHERE id = ${childId} AND parent_id = ${auth.parentId}
    `) as Array<{ id: string }>
    if (!owned[0]) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const goal = await createParentTaskGoal(auth.parentId, {
      childId,
      name,
      description,
      emoji,
      targetPc: targetPc || 1,
      rewardPc,
      rewardXp,
    })

    await createChildNotification(
      childId,
      "📋 New task from your parent!",
      `${name}${description ? `: ${description}` : ""}. Complete it to earn ${rewardPc} PC and ${rewardXp} XP!`,
      "info"
    )

    return NextResponse.json({ goal })
  } catch (e) {
    console.error("[parent/tasks]", e)
    const message = e instanceof Error ? e.message : "Failed to create task"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
