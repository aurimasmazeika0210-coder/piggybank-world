import { NextRequest, NextResponse } from "next/server"
import { loginParent } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      )
    }
    const result = await loginParent(email, password)
    if (!result.success) {
      return NextResponse.json(result, { status: 401 })
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error("[auth/login]", e)
    return NextResponse.json(
      { success: false, error: "Login failed" },
      { status: 500 }
    )
  }
}
