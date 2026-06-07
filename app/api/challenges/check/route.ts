import { NextResponse } from "next/server"
import { checkChallengeProgress, checkProfitChallenge } from "@/lib/services/challenge-service"
import type { ChallengeEventType } from "@/lib/db"

export const dynamic = "force-dynamic"

interface CheckProgressRequest {
  childId: string
  eventType: ChallengeEventType
  // Additional data for sell events
  sellPrice?: number
  avgBuyPrice?: number
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as CheckProgressRequest
    const { childId, eventType, sellPrice, avgBuyPrice } = body

    if (!childId || !eventType) {
      return NextResponse.json(
        { error: "childId and eventType are required" },
        { status: 400 }
      )
    }

    const validEventTypes: ChallengeEventType[] = ["buy", "sell", "lesson_quiz", "daily_check"]
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json(
        { error: `Invalid eventType. Must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      )
    }

    const completedChallenges = await checkChallengeProgress(childId, eventType)

    // For sell events with profit data, also check profit challenge
    if (eventType === "sell" && sellPrice !== undefined && avgBuyPrice !== undefined) {
      const profitResult = await checkProfitChallenge(childId, sellPrice, avgBuyPrice)
      if (profitResult) {
        completedChallenges.push(profitResult)
      }
    }

    return NextResponse.json({
      success: true,
      childId,
      eventType,
      completedChallenges,
      challengesCompleted: completedChallenges.length,
    })
  } catch (error) {
    console.error("Challenge progress check error:", error)
    return NextResponse.json(
      { error: "Failed to check challenge progress", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
