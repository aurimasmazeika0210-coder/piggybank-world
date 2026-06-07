import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { createGoalForChild, getGoalsForChild } from "@/lib/goals"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const goals = await getGoalsForChild(childId)
    return NextResponse.json({ goals: goals.map((g) => ({ ...g, target: g.target, saved: g.saved })) })
  } catch (e) {
    console.error("[children/goals GET]", e)
    return NextResponse.json({ error: "Failed to load goals" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const body = await request.json()
    const goal = await createGoalForChild(childId, {
      emoji: body.emoji,
      name: body.name,
      target: body.targetPc ?? body.target,
    })
    return NextResponse.json({ goal })
  } catch (e) {
    console.error("[children/goals POST]", e)
    const message = e instanceof Error ? e.message : "Failed to create goal"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
