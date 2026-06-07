import { NextRequest, NextResponse } from "next/server"
import { signupParent } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()
    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      )
    }
    const result = await signupParent(name, email, password)
    if (!result.success) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error("[auth/signup]", e)
    const msg = e instanceof Error ? e.message : ""
    const needsSetup = msg.includes("does not exist") || msg.includes("42P01")
    return NextResponse.json(
      {
        success: false,
        error: needsSetup
          ? "Database tables missing. Run lib/auth-setup.sql in Supabase SQL Editor, then try again."
          : "Signup failed",
      },
      { status: 500 }
    )
  }
}
