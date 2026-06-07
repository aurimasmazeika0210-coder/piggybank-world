import { NextRequest, NextResponse } from "next/server"
import { logChildActivity } from "@/lib/child-activities"
import { sql } from "@/lib/db"
import { createNotification, getChildName, getParentIdForChild } from "@/lib/notifications"
import { checkChallengeProgress } from "@/lib/services/challenge-service"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const { childId, companyId, quantity } = await req.json()

    if (!childId || !companyId || !quantity || quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const companies = (await sql`
      SELECT current_price, name FROM companies WHERE id = ${companyId}
    `) as Array<{ current_price: number; name: string }>

    if (!companies[0]) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 })
    }

    const pricePerShare = Number(companies[0].current_price)
    const totalCost = pricePerShare * quantity

    const wallets = (await sql`
      SELECT xp_balance FROM wallets WHERE child_id = ${childId}
    `) as Array<{ xp_balance: number }>

    const balance = Number(wallets[0]?.xp_balance ?? 0)
    if (balance < totalCost) {
      return NextResponse.json({ error: "Insufficient balance" }, { status: 400 })
    }

    await sql`
      UPDATE wallets SET xp_balance = xp_balance - ${totalCost}, updated_at = NOW()
      WHERE child_id = ${childId}
    `

    try {
      await sql`
        UPDATE wallets
        SET locked_investment_pc = locked_investment_pc + ${totalCost}, updated_at = NOW()
        WHERE child_id = ${childId}
      `
    } catch {
      // locked_investment_pc column may not exist until migration is run
    }

    const existing = (await sql`
      SELECT shares, avg_buy_price FROM portfolio
      WHERE child_id = ${childId} AND company_id = ${companyId}
    `) as Array<{ shares: number; avg_buy_price: number }>

    if (existing[0]) {
      const oldShares = Number(existing[0].shares)
      const oldAvg = Number(existing[0].avg_buy_price)
      const newShares = oldShares + quantity
      const newAvg = (oldAvg * oldShares + pricePerShare * quantity) / newShares
      await sql`
        UPDATE portfolio
        SET shares = ${newShares}, avg_buy_price = ${newAvg}
        WHERE child_id = ${childId} AND company_id = ${companyId}
      `
    } else {
      await sql`
        INSERT INTO portfolio (child_id, company_id, shares, avg_buy_price)
        VALUES (${childId}, ${companyId}, ${quantity}, ${pricePerShare})
      `
    }

    try {
      await checkChallengeProgress(childId, "buy")
    } catch (challengeErr) {
      console.error("[portfolio/buy] challenge check failed (buy still succeeded):", challengeErr)
    }

    await logChildActivity(
      childId,
      "investment_buy",
      `Bought ${quantity} shares of ${companies[0].name}`,
      totalCost,
      "completed"
    )

    const parentId = await getParentIdForChild(childId)
    if (parentId) {
      const childName = await getChildName(childId)
      await createNotification(
        parentId,
        `📈 ${childName} bought shares`,
        `${childName} invested ${totalCost} PC in ${companies[0].name}`,
        "info"
      )
    }

    const updated = (await sql`
      SELECT xp_balance FROM wallets WHERE child_id = ${childId}
    `) as Array<{ xp_balance: number }>

    const holdings = (await sql`
      SELECT p.company_id, p.shares, p.avg_buy_price, c.current_price, c.name
      FROM portfolio p JOIN companies c ON c.id = p.company_id
      WHERE p.child_id = ${childId} AND p.shares > 0
    `) as Array<{
      company_id: string
      shares: number
      avg_buy_price: number
      current_price: number
      name: string
    }>

    return NextResponse.json({
      success: true,
      newBalance: Number(updated[0]?.xp_balance ?? 0),
      sharesOwned: (existing[0] ? Number(existing[0].shares) : 0) + quantity,
      portfolioValue: holdings.reduce((s, h) => s + Number(h.current_price) * Number(h.shares), 0),
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Failed to buy shares" }, { status: 500 })
  }
}
