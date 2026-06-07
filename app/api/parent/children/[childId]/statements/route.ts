import { NextResponse } from "next/server"
import { buildChildPortfolio, buildChildTransactions } from "@/lib/child-dashboard"
import { getLessonStarsForChild } from "@/lib/child-lessons"
import { requireParentSession } from "@/lib/parent-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response

    const owned = (await sql`
      SELECT id FROM children WHERE id = ${childId} AND parent_id = ${auth.parentId}
    `) as Array<{ id: string }>
    if (!owned[0]) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const [portfolio, transactions, stars] = await Promise.all([
      buildChildPortfolio(childId),
      buildChildTransactions(childId, 20),
      getLessonStarsForChild(childId),
    ])

    const holdings = (await sql`
      SELECT p.shares, p.avg_buy_price, c.name, c.icon, c.current_price
      FROM portfolio p
      JOIN companies c ON c.id = p.company_id
      WHERE p.child_id = ${childId} AND p.shares > 0
    `) as Array<{
      shares: number
      avg_buy_price: number
      name: string
      icon: string | null
      current_price: number
    }>

    const portfolioRows = holdings.map((h) => {
      const shares = Number(h.shares)
      const value = Math.round(Number(h.current_price) * shares)
      const cost = Math.round(Number(h.avg_buy_price) * shares)
      return {
        companyName: h.name,
        icon: h.icon ?? "📈",
        shares,
        value,
        profitLoss: value - cost,
      }
    })

    return NextResponse.json({
      balance: portfolio.balance,
      totalInvested: portfolio.totalInvested,
      portfolioValue: portfolio.portfolioValue,
      profitLoss: portfolio.portfolioValue - portfolio.totalInvested,
      lessonsCompleted: stars.filter((s) => s >= 3).length,
      portfolio: portfolioRows,
      transactions: transactions.map((tx) => ({
        id: tx.id,
        merchant: tx.merchant,
        amount: tx.amount,
        time: tx.time,
        status: tx.status === "blocked" ? "blocked" : "approved",
      })),
    })
  } catch (e) {
    console.error("[parent/children/statements]", e)
    return NextResponse.json({ error: "Failed to load statements" }, { status: 500 })
  }
}
