import { NextResponse } from "next/server"
import { getChallengesWithProgress, getWallet } from "@/lib/services/challenge-service"

export const dynamic = "force-dynamic"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    
    if (!childId) {
      return NextResponse.json({ error: "Child ID is required" }, { status: 400 })
    }

    const [challenges, wallet] = await Promise.all([
      getChallengesWithProgress(childId),
      getWallet(childId),
    ])

    return NextResponse.json({
      success: true,
      childId,
      challenges,
      wallet,
    })
  } catch (error) {
    console.error("Challenges fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch challenges", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
