import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

type NotificationRow = {
  id: number
  title: string
  body: string
  is_read: boolean
  type: string
  created_at: Date
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    let rows: NotificationRow[] = []
    try {
      rows = (await sql`
        SELECT id, title, body, is_read, type, created_at
        FROM child_notifications
        WHERE child_id = ${childId}
        ORDER BY created_at DESC
        LIMIT 50
      `) as NotificationRow[]
    } catch {
      return NextResponse.json([])
    }

    return NextResponse.json(
      rows.map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        isRead: Boolean(n.is_read),
        type: n.type,
        createdAt: n.created_at,
      }))
    )
  } catch (e) {
    console.error("[children/notifications GET]", e)
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    try {
      await sql`DELETE FROM child_notifications WHERE child_id = ${childId}`
    } catch {
      // table optional
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[children/notifications DELETE]", e)
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 })
  }
}
