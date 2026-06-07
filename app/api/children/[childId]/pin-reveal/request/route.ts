import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { createNotification, getChildName, getParentIdForChild } from "@/lib/notifications"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const parentId = await getParentIdForChild(childId)
    if (!parentId) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 })
    }

    const childName = await getChildName(childId)
    await createNotification(
      parentId,
      "🔐 PIN code requested",
      `${childName} wants to view their card PIN. Open the parent app and tap "Generate PIN code" for them.`,
      "info"
    )

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[pin-reveal/request]", e)
    return NextResponse.json({ error: "Failed to notify parent" }, { status: 500 })
  }
}
