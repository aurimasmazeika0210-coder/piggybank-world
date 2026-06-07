import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { contributeToGoalForChild } from "@/lib/goals"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string; goalId: string }> }
) {
  try {
    const { childId, goalId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const { amount } = await request.json()
    const result = await contributeToGoalForChild(childId, goalId, amount)
    return NextResponse.json({
      newBalance: result.newBalance,
      goal: result.goal,
      applied: result.applied,
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to add to goal"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
