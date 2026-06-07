import { NextResponse } from "next/server"
import { checkChallengeProgress } from "@/lib/services/challenge-service"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// Daily cron job to check hold streaks for all users with holdings
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/daily-challenges", "schedule": "0 0 * * *" }] }
export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all unique child IDs with portfolio holdings
    const childrenWithHoldings = await sql`
      SELECT DISTINCT child_id FROM portfolio WHERE shares > 0
    ` as Array<{ child_id: string }>

    const results: Array<{
      childId: string
      completedChallenges: number
    }> = []

    // Check daily streak for each child
    for (const { child_id } of childrenWithHoldings) {
      const completed = await checkChallengeProgress(child_id, "daily_check")
      results.push({
        childId: child_id,
        completedChallenges: completed.length,
      })
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      usersChecked: results.length,
      results,
    })
  } catch (error) {
    console.error("Daily challenges cron error:", error)
    return NextResponse.json(
      { error: "Failed to run daily challenges check", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
