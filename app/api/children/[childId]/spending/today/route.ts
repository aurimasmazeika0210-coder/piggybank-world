import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { buildSpendingToday } from "@/lib/child-dashboard"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const spending = await buildSpendingToday(childId)
    return NextResponse.json(spending)
  } catch (e) {
    console.error("[children/spending/today]", e)
    return NextResponse.json({ error: "Failed to load spending data" }, { status: 500 })
  }
}
