import { NextResponse } from "next/server"
import { getParentBySession, getSession } from "@/lib/auth"
import { sql } from "@/lib/db"

export async function requireChildApiAccess(
  childId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const session = await getSession()
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }

  if (session.userType === "child" && session.userId === childId) {
    return { ok: true }
  }

  if (session.userType === "parent") {
    const parent = await getParentBySession()
    if (parent) {
      const rows = (await sql`
        SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parent.id}
      `) as Array<{ id: string }>
      if (rows[0]) return { ok: true }
    }
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  }
}
