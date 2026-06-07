import { NextRequest, NextResponse } from "next/server"
import {
  getChildSpendingLimits,
  updateChildSpendingLimits,
  type ChildCardLimits,
} from "@/lib/auth"
import { requireParentSession } from "@/lib/parent-api-auth"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response

    const limits = await getChildSpendingLimits(auth.parentId, childId)
    if (!limits) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    return NextResponse.json(limits)
  } catch (e) {
    console.error("[parent/children/limits GET]", e)
    return NextResponse.json({ error: "Failed to load limits" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response

    const limits = (await request.json()) as ChildCardLimits
    const ok = await updateChildSpendingLimits(auth.parentId, childId, limits)
    if (!ok) {
      return NextResponse.json({ error: "Child not found or save failed" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[parent/children/limits PUT]", e)
    return NextResponse.json({ error: "Failed to save limits" }, { status: 500 })
  }
}
