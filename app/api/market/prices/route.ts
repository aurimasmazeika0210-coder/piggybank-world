import { NextResponse } from "next/server"
import { getMarketPrices, getMarketNews } from "@/lib/services/market-simulation"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const [prices, news] = await Promise.all([
      getMarketPrices(),
      getMarketNews(5),
    ])

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      prices,
      recentNews: news,
    })
  } catch (error) {
    console.error("Market prices fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch market prices", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
