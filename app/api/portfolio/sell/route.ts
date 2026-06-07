import { NextRequest, NextResponse } from "next/server"
import { logChildActivity } from "@/lib/child-activities"
import { sql } from "@/lib/db"
import { createNotification, getChildName, getParentIdForChild } from "@/lib/notifications"
import { checkChallengeProgress, checkProfitChallenge } from "@/lib/services/challenge-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { childId, companyId, quantity } = await req.json()

    if (!childId || !companyId || !quantity || quantity < 1) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const holdings = (await sql`
      SELECT shares, avg_buy_price FROM portfolio
      WHERE child_id = ${childId} AND company_id = ${companyId}
    `) as Array<{ shares: number; avg_buy_price: number }>

    if (!holdings[0] || Number(holdings[0].shares) < quantity) {
      return NextResponse.json({ error: "Insufficient shares" }, { status: 400 })
    }

    const companies = (await sql`
      SELECT current_price, name FROM companies WHERE id = ${companyId}
    `) as Array<{ current_price: number; name: string }>

    const sellPrice = Number(companies[0].current_price)
    const avgBuyPrice = Number(holdings[0].avg_buy_price)
    const proceeds = sellPrice * quantity
    const profitLoss = (sellPrice - avgBuyPrice) * quantity
    const costBasis = avgBuyPrice * quantity

    await sql`
      UPDATE wallets SET xp_balance = xp_balance + ${proceeds}, updated_at = NOW()
      WHERE child_id = ${childId}
    `

    try {
      await sql`
        UPDATE wallets
        SET locked_investment_pc = GREATEST(0, locked_investment_pc - ${costBasis}), updated_at = NOW()
        WHERE child_id = ${childId}
      `
    } catch {
      // locked_investment_pc column may not exist until migration is run
    }

    const newShares = Number(holdings[0].shares) - quantity
    if (newShares === 0) {
      await sql`DELETE FROM portfolio WHERE child_id = ${childId} AND company_id = ${companyId}`
    } else {
      await sql`
        UPDATE portfolio SET shares = ${newShares}
        WHERE child_id = ${childId} AND company_id = ${companyId}
      `
    }

    try {
      await checkChallengeProgress(childId, "sell")
      await checkProfitChallenge(childId, sellPrice, avgBuyPrice)
    } catch (challengeErr) {
      console.error("[portfolio/sell] challenge check failed (sell still succeeded):", challengeErr)
    }

    await logChildActivity(
      childId,
      "investment_sell",
      `Sold ${quantity} shares of ${companies[0].name}`,
      proceeds,
      "completed"
    )

    const parentId = await getParentIdForChild(childId)
    if (parentId) {
      const childName = await getChildName(childId)
      await createNotification(
        parentId,
        `💰 ${childName} sold shares`,
        `${childName} sold ${quantity} shares of ${companies[0].name} for ${proceeds} PC`,
        "info"
      )
    }

    const updated = (await sql`
      SELECT xp_balance FROM wallets WHERE child_id = ${childId}
    `) as Array<{ xp_balance: number }>

    return NextResponse.json({
      success: true,
      newBalance: Number(updated[0]?.xp_balance ?? 0),
      profitLoss,
      proceeds,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to sell shares" }, { status: 500 })
  }
}
