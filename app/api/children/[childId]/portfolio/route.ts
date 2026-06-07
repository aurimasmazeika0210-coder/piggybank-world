import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { buildChildPortfolio } from "@/lib/child-dashboard"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const portfolio = await buildChildPortfolio(childId)
    return NextResponse.json(portfolio)
  } catch (e) {
    console.error("[children/portfolio]", e)
    return NextResponse.json({ error: "Failed to load portfolio" }, { status: 500 })
  }
}
