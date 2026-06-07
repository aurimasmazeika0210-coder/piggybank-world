import { NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"
import { getParentActivities } from "@/lib/child-activities"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const activities = await getParentActivities(parent.id, 30)
    return NextResponse.json(activities)
  } catch (e) {
    console.error("[parent/activity GET]", e)
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 })
  }
}
