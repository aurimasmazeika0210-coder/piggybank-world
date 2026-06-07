import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { setCardFrozen } from "@/lib/card-freeze"
import { createNotification, getChildName, getParentIdForChild } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const { frozen } = await request.json()
    if (typeof frozen !== "boolean") {
      return NextResponse.json({ error: "frozen must be a boolean" }, { status: 400 })
    }

    const ok = await setCardFrozen(childId, frozen)
    if (!ok) {
      return NextResponse.json({ error: "Failed to update card status" }, { status: 500 })
    }

    if (frozen) {
      const parentId = await getParentIdForChild(childId)
      if (parentId) {
        const childName = await getChildName(childId)
        await createNotification(
          parentId,
          "🧊 Card frozen",
          `${childName} froze their card`,
          "warning"
        )
      }
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[children/card/freeze]", e)
    return NextResponse.json({ error: "Failed to update card status" }, { status: 500 })
  }
}
