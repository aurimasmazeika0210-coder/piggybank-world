import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    try {
      await sql`
        UPDATE child_notifications
        SET is_read = true
        WHERE child_id = ${childId} AND is_read = false
      `
    } catch {
      // table optional
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[children/notifications/read-all]", e)
    return NextResponse.json({ error: "Failed to mark notifications read" }, { status: 500 })
  }
}
