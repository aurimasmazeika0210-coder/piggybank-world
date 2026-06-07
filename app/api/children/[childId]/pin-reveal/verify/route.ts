import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import { verifyPinRevealCode } from "@/lib/pin-reveal"

export const dynamic = "force-dynamic"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const { code } = await request.json()
    const result = await verifyPinRevealCode(childId, String(code ?? ""))

    if (!result.valid) {
      return NextResponse.json(
        { valid: false, error: result.error ?? "Invalid or expired code" },
        { status: 400 }
      )
    }

    return NextResponse.json({ valid: true, pin: result.pin })
  } catch (e) {
    console.error("[pin-reveal/verify]", e)
    return NextResponse.json({ valid: false, error: "Failed to verify code" }, { status: 500 })
  }
}
