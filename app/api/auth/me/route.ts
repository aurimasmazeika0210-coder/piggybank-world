import { NextResponse } from "next/server"
import { getParentBySession, getSession } from "@/lib/auth"

export async function GET() {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 404 })
    }

    if (session.userType === "parent") {
      const parent = await getParentBySession()
      if (!parent) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 404 })
      }
      return NextResponse.json({
        userId: session.userId,
        userType: session.userType,
        name: parent.name,
        email: parent.email,
      })
    }

    return NextResponse.json({
      userId: session.userId,
      userType: session.userType,
    })
  } catch (e) {
    console.error("[auth/me]", e)
    return NextResponse.json({ error: "Failed to get session" }, { status: 500 })
  }
}
