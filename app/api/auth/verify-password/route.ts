import { NextRequest, NextResponse } from "next/server"
import { getParentBySession, hashPassword } from "@/lib/auth"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { password } = await request.json()
    if (!password || typeof password !== "string") {
      return NextResponse.json({ valid: false })
    }

    const rows = (await sql`
      SELECT password_hash FROM parents WHERE id = ${parent.id}
    `) as Array<{ password_hash: string }>

    if (!rows[0]) {
      return NextResponse.json({ valid: false })
    }

    const hash = await hashPassword(password)
    return NextResponse.json({ valid: hash === rows[0].password_hash })
  } catch (e) {
    console.error("[auth/verify-password]", e)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}
