import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { getParentBySession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rows = (await sql`
      SELECT id, title, body, is_read, type, created_at
      FROM notifications
      WHERE parent_id = ${parent.id}
      ORDER BY created_at DESC
      LIMIT 20
    `) as Array<{
      id: number
      title: string
      body: string
      is_read: boolean
      type: string
      created_at: string
    }>

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        body: r.body,
        isRead: Boolean(r.is_read),
        type: r.type,
        createdAt: r.created_at,
      }))
    )
  } catch (e) {
    console.error("[parent/notifications GET]", e)
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await sql`
      DELETE FROM notifications WHERE parent_id = ${parent.id}
    `
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[parent/notifications DELETE]", e)
    return NextResponse.json({ error: "Failed to delete notifications" }, { status: 500 })
  }
}
