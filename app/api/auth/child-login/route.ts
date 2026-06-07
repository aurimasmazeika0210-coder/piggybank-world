import { NextRequest, NextResponse } from "next/server"
import { consumeChildLoginOtp, loginChild } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = String(body.loginCode ?? body.pin ?? "").trim()
    if (!code || code.length !== 6) {
      return NextResponse.json(
        { success: false, error: "Enter your 6-digit login code" },
        { status: 400 }
      )
    }
    const child = await consumeChildLoginOtp(code)
    if (!child) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired code. Ask your parent for the current code.",
        },
        { status: 401 }
      )
    }
    await loginChild(child.id)
    return NextResponse.json({ success: true, childId: child.id })
  } catch (e) {
    console.error("[auth/child-login]", e)
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    )
  }
}
