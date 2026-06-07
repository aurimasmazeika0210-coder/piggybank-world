import { NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { buildChildProfile } from "@/lib/child-dashboard"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const profile = await buildChildProfile(childId)
    if (!profile) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (e) {
    console.error("[children/profile]", e)
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 })
  }
}
