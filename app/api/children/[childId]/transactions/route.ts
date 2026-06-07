import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { buildChildTransactions } from "@/lib/child-dashboard"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const limit = Math.min(
      50,
      Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 10))
    )
    const transactions = await buildChildTransactions(childId, limit)
    return NextResponse.json(transactions)
  } catch (e) {
    console.error("[children/transactions]", e)
    return NextResponse.json({ error: "Failed to load transactions" }, { status: 500 })
  }
}
