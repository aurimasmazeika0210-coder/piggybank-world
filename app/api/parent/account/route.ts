import { NextResponse } from "next/server"
import { deleteParentAccount, deleteSession, getParentBySession } from "@/lib/auth"

export async function DELETE() {
  try {
    const parent = await getParentBySession()
    if (!parent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await deleteParentAccount(parent.id)
    await deleteSession()
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[parent/account DELETE]", e)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
