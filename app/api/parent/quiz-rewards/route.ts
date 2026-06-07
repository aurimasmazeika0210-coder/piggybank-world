import { NextRequest, NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"
import {
  getQuizRewardsForParent,
  saveQuizRewardsForParent,
} from "@/lib/quiz-rewards"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rewards = await getQuizRewardsForParent(parent.id)
    return NextResponse.json({ rewards })
  } catch (e) {
    console.error("[parent/quiz-rewards GET]", e)
    return NextResponse.json({ error: "Failed to load quiz rewards" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const rewards = body.rewards as Record<string, number>
    if (!rewards || typeof rewards !== "object") {
      return NextResponse.json({ error: "Invalid rewards" }, { status: 400 })
    }

    await saveQuizRewardsForParent(parent.id, rewards)
    const updated = await getQuizRewardsForParent(parent.id)
    return NextResponse.json({ ok: true, rewards: updated })
  } catch (e) {
    console.error("[parent/quiz-rewards PUT]", e)
    return NextResponse.json({ error: "Failed to save quiz rewards" }, { status: 500 })
  }
}
