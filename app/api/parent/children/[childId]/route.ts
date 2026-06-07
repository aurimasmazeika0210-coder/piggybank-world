import { NextResponse } from "next/server"
import { deleteChild } from "@/lib/auth"
import { requireParentSession } from "@/lib/parent-api-auth"

export const dynamic = "force-dynamic"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const auth = await requireParentSession()
    if (!auth.ok) return auth.response

    const ok = await deleteChild(auth.parentId, childId)
    if (!ok) {
      return NextResponse.json({ error: "Child not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[parent/children DELETE]", e)
    return NextResponse.json({ error: "Failed to delete child" }, { status: 500 })
  }
}
