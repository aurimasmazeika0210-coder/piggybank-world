import { NextRequest, NextResponse } from "next/server"
import { logChildActivity } from "@/lib/child-activities"
import { notifyChild } from "@/lib/child-notifications"
import { requireParentSession } from "@/lib/parent-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
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

    const { piggyCoins } = await request.json()
    const amount = Math.round(Number(piggyCoins))
    if (!amount || amount < 1 || amount > 500) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    const updated = (await sql`
      UPDATE wallets
      SET xp_balance = xp_balance + ${amount}, updated_at = NOW()
      WHERE child_id = ${childId}
      RETURNING xp_balance
    `) as Array<{ xp_balance: number }>

    if (!updated[0]) {
      await sql`
        INSERT INTO wallets (child_id, xp_balance, trusty_score)
        VALUES (${childId}, ${amount}, 75)
      `
    }

    const rows = (await sql`
      SELECT xp_balance FROM wallets WHERE child_id = ${childId}
    `) as Array<{ xp_balance: number }>

    await logChildActivity(childId, "top_up", "Parent top-up", amount, "completed")
    await notifyChild(
      childId,
      "PiggyCoins added",
      `Your parent added ${amount} PiggyCoins to your wallet.`,
      "top_up"
    )

    return NextResponse.json({
      success: true,
      newBalance: Number(rows[0]?.xp_balance ?? amount),
    })
  } catch (e) {
    console.error("[parent/children/top-up]", e)
    return NextResponse.json({ error: "Top-up failed" }, { status: 500 })
  }
}
