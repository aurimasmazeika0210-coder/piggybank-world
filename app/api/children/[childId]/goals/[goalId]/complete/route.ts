import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { completeParentTaskGoal } from "@/lib/goals"
import { createNotification } from "@/lib/notifications"
import { logChildActivity } from "@/lib/child-activities"
import { getChildName } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ childId: string; goalId: string }> }
) {
  try {
    const { childId, goalId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const result = await completeParentTaskGoal(childId, goalId)

    if (result.rewardPc > 0) {
      await logChildActivity(
        childId,
        "lesson_reward",
        `Task complete: ${result.taskName}`,
        result.rewardPc,
        "completed"
      )
    }

    if (result.parentId) {
      const childName = await getChildName(childId)
      await createNotification(
        result.parentId,
        `✅ ${childName} completed a task`,
        `${childName} completed "${result.taskName}"! Pay them ${result.rewardPc} PC reward.`,
        "success"
      )
    }

    return NextResponse.json({
      goal: result.goal,
      newBalance: result.newBalance,
      rewardPc: result.rewardPc,
      rewardXp: result.rewardXp,
    })
  } catch (e) {
    console.error("[goals/complete]", e)
    const message = e instanceof Error ? e.message : "Failed to complete task"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
