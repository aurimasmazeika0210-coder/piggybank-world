import { NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const notificationId = Number((await params).id)
    if (!Number.isFinite(notificationId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 })
    }

    await sql`
      DELETE FROM notifications
      WHERE id = ${notificationId} AND parent_id = ${parent.id}
    `

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[parent/notifications/id DELETE]", e)
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 })
  }
}
