import { NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = (await sql`
      SELECT
        p.child_id,
        ch.name as child_name,
        p.company_id,
        p.shares,
        p.avg_buy_price,
        c.current_price,
        c.name as company_name,
        c.icon as company_icon
      FROM portfolio p
      JOIN companies c ON c.id = p.company_id
      JOIN children ch ON ch.id = p.child_id
      WHERE p.shares > 0 AND ch.parent_id = ${parent.id}
      ORDER BY p.child_id, p.company_id
    `) as Array<{
      child_id: string
      child_name: string
      company_id: string
      shares: number
      avg_buy_price: number
      current_price: number
      company_name: string
      company_icon: string | null
    }>

    const result: Record<
      string,
      {
        childName: string
        invested: number
        currentValue: number
        profit: number
        profitPercent: number
        portfolio: Array<{ company: string; emoji: string; amount: number; shares: number }>
      }
    > = {}

    for (const row of rows) {
      const key = row.child_id
      if (!result[key]) {
        result[key] = {
          childName: row.child_name,
          invested: 0,
          currentValue: 0,
          profit: 0,
          profitPercent: 0,
          portfolio: [],
        }
      }
      const invested = Number(row.avg_buy_price) * Number(row.shares)
      const currentValue = Number(row.current_price) * Number(row.shares)
      result[key].invested += invested
      result[key].currentValue += currentValue
      result[key].portfolio.push({
        company: row.company_name,
        emoji: row.company_icon ?? "📈",
        amount: Math.round(currentValue),
        shares: Number(row.shares),
      })
    }

    for (const key of Object.keys(result)) {
      const inv = result[key]
      inv.profit = Math.round(inv.currentValue - inv.invested)
      inv.profitPercent =
        inv.invested > 0
          ? parseFloat((((inv.currentValue - inv.invested) / inv.invested) * 100).toFixed(1))
          : 0
      inv.invested = Math.round(inv.invested)
      inv.currentValue = Math.round(inv.currentValue)
    }

    return NextResponse.json(result)
  } catch (e) {
    console.error("[parent/investments]", e)
    return NextResponse.json({}, { status: 500 })
  }
}
