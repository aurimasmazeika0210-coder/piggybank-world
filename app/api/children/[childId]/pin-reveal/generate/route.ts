import { NextResponse } from "next/server"
import { getParentBySession, getSession } from "@/lib/auth"
import { generatePinRevealCode } from "@/lib/pin-reveal"
import { sql } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const session = await getSession()
    if (!session || session.userType !== "parent") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const owned = (await sql`
      SELECT id FROM children WHERE id = ${childId} AND parent_id = ${parent.id}
    `) as Array<{ id: string }>
    if (!owned[0]) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    const code = await generatePinRevealCode(childId)
    return NextResponse.json({ code })
  } catch (e) {
    console.error("[pin-reveal/generate]", e)
    return NextResponse.json({ error: "Failed to generate code" }, { status: 500 })
  }
}
