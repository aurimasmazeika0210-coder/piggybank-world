import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ childId: string; id: string }> }
) {
  try {
    const { childId, id } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const notificationId = Number(id)
    if (!Number.isFinite(notificationId)) {
      return NextResponse.json({ error: "Invalid notification id" }, { status: 400 })
    }

    try {
      await sql`
        DELETE FROM child_notifications
        WHERE id = ${notificationId} AND child_id = ${childId}
      `
    } catch {
      // table optional
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[children/notifications/id DELETE]", e)
    return NextResponse.json({ error: "Failed to delete notification" }, { status: 500 })
  }
}
