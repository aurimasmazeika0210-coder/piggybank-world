import { NextResponse } from "next/server"
import { simulateMarketPrices } from "@/lib/services/market-simulation"

// Vercel Cron Job - runs every 6 hours
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/market-simulation", "schedule": "0 */6 * * *" }] }
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  try {
    // Verify the request is from Vercel Cron (in production)
    const authHeader = request.headers.get("authorization")
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await simulateMarketPrices()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      updates: result.updates,
      newsGenerated: result.newsGenerated,
    })
  } catch (error) {
    console.error("Market simulation error:", error)
    return NextResponse.json(
      { error: "Failed to simulate market prices", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
