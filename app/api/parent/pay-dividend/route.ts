import { NextRequest, NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"
import { createChildNotification, createNotification } from "@/lib/notifications"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { childId, amount } = await req.json()
    if (!childId || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 })
    }

    const owned = (await sql`
      SELECT id, name FROM children WHERE id = ${childId} AND parent_id = ${parent.id}
    `) as Array<{ id: string; name: string }>
    if (!owned[0]) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    await sql`
      UPDATE wallets SET xp_balance = xp_balance + ${amount}, updated_at = NOW()
      WHERE child_id = ${childId}
    `

    try {
      await sql`
        INSERT INTO dividends_paid (parent_id, child_id, amount_pc, reason)
        VALUES (${parent.id}, ${childId}, ${amount}, ${"Manual dividend payment"})
      `
    } catch {
      // dividends_paid table may not exist yet
    }

    await createChildNotification(
      childId,
      "💰 You received a dividend!",
      `Your parent paid you ${amount} PC dividend for your investments`,
      "success"
    )

    await createNotification(
      parent.id,
      "✅ Dividend paid",
      `You paid ${amount} PC to ${owned[0].name}`,
      "success"
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[parent/pay-dividend]", e)
    return NextResponse.json({ error: "Failed to pay dividend" }, { status: 500 })
  }
}
