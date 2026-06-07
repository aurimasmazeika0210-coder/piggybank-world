import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth"

export async function POST() {
  try {
    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[auth/logout]", e)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
