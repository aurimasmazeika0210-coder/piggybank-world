import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { contributeToGoalForChild } from "@/lib/goals"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const { goalId, amount } = await request.json()
    if (!goalId) {
      return NextResponse.json({ error: "goalId is required" }, { status: 400 })
    }

    const result = await contributeToGoalForChild(childId, goalId, amount)
    return NextResponse.json({
      newBalance: result.newBalance,
      goal: result.goal,
      applied: result.applied,
    })
  } catch (e) {
    console.error("[children/goals/contribute]", e)
    const message = e instanceof Error ? e.message : "Failed to contribute"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
