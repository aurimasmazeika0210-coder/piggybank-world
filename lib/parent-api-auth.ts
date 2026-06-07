import { NextResponse } from "next/server"
import { getParentBySession } from "@/lib/auth"

export async function requireParentSession(): Promise<
  { ok: true; parentId: string } | { ok: false; response: NextResponse }
> {
  const parent = await getParentBySession()
  if (!parent) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    }
  }
  return { ok: true, parentId: parent.id }
}
