import { NextRequest, NextResponse } from "next/server"
import { getCardFrozen, setCardFrozen } from "@/lib/card-freeze"
import { createChildNotification } from "@/lib/notifications"
import { requireParentSession } from "@/lib/parent-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

async function childBelongsToParent(childId: string, parentId: string) {
  const rows = (await sql`
    SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parentId}
  `) as Array<{ id: string }>
  return Boolean(rows[0])
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response
    if (!(await childBelongsToParent(childId, auth.parentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const frozen = await getCardFrozen(childId)
    return NextResponse.json({ frozen })
  } catch (e) {
    console.error("[parent/children/freeze GET]", e)
    return NextResponse.json({ error: "Failed to load card status" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response
    if (!(await childBelongsToParent(childId, auth.parentId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    const { frozen } = await request.json()
    if (typeof frozen !== "boolean") {
      return NextResponse.json({ error: "frozen must be a boolean" }, { status: 400 })
    }

    const ok = await setCardFrozen(childId, frozen)
    if (!ok) {
      return NextResponse.json({ error: "Failed to update card" }, { status: 500 })
    }

    if (!frozen) {
      await createChildNotification(
        childId,
        "✅ Card unfrozen",
        "Your parent unfroze your card. You can spend again!",
        "success"
      )
    }

    return NextResponse.json({ success: true, frozen })
  } catch (e) {
    console.error("[parent/children/freeze POST]", e)
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 })
  }
}
