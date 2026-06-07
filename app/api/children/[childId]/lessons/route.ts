import { NextRequest, NextResponse } from "next/server"
import { requireChildApiAccess } from "@/lib/child-api-auth"
import {
  getLessonStarsForChild,
  saveLessonStarsForChild,
} from "@/lib/child-lessons"
import { LESSONS, investmentXpFromStars } from "@/lib/lessons-data"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const stars = await getLessonStarsForChild(childId)
    return NextResponse.json({
      stars,
      investmentXp: investmentXpFromStars(stars),
      lessonCount: LESSONS.length,
    })
  } catch (e) {
    console.error("[children/lessons GET]", e)
    return NextResponse.json({ error: "Failed to load lesson progress" }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params
    const access = await requireChildApiAccess(childId)
    if (!access.ok) return access.response

    const { lessonIndex, stars } = await request.json()
    if (typeof lessonIndex !== "number") {
      return NextResponse.json({ error: "lessonIndex is required" }, { status: 400 })
    }

    const result = await saveLessonStarsForChild(childId, lessonIndex, stars)
    return NextResponse.json(result)
  } catch (e) {
    console.error("[children/lessons POST]", e)
    const message = e instanceof Error ? e.message : "Failed to save lesson"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
