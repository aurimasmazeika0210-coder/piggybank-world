import { logChildActivity } from "@/lib/child-activities"
import { sql } from "@/lib/db"
import { createNotification, getChildName, getParentIdForChild } from "@/lib/notifications"
import { getQuizRewardPc } from "@/lib/quiz-rewards"
import {
  LESSONS,
  emptyLessonStars,
  investmentXpFromStars,
  isLessonUnlocked,
} from "@/lib/lessons-data"
import { checkChallengeProgress } from "@/lib/services/challenge-service"

async function getWalletBalance(childId: string): Promise<number> {
  const rows = (await sql`
    SELECT xp_balance FROM wallets WHERE child_id = ${childId}
  `) as Array<{ xp_balance: number }>
  return Number(rows[0]?.xp_balance ?? 0)
}

export async function getLessonStarsForChild(childId: string): Promise<number[]> {
  const stars = emptyLessonStars()
  try {
    const rows = (await sql`
      SELECT lesson_id, stars
      FROM lesson_progress
      WHERE child_id = ${childId}
    `) as Array<{ lesson_id: string; stars: number }>
    for (const row of rows) {
      const idx = LESSONS.findIndex((l) => l.id === row.lesson_id)
      if (idx >= 0) {
        stars[idx] = Math.max(stars[idx] ?? 0, Number(row.stars) || 0)
      }
    }
  } catch {
    // lesson_progress table may not exist until migration is run
  }
  return stars
}

export async function saveLessonStarsForChild(
  childId: string,
  lessonIndex: number,
  stars: number
): Promise<{
  stars: number[]
  investmentXp: number
  rewardPc: number
  newBalance: number
}> {
  if (lessonIndex < 0 || lessonIndex >= LESSONS.length) {
    throw new Error("Invalid lesson")
  }

  const newStars = Math.max(0, Math.min(3, Math.round(stars)))
  const current = await getLessonStarsForChild(childId)
  const previous = current[lessonIndex] ?? 0

  if (newStars > 0 && !isLessonUnlocked(lessonIndex, current)) {
    throw new Error("Lesson is locked")
  }

  if (newStars <= previous) {
    return {
      stars: current,
      investmentXp: investmentXpFromStars(current),
      rewardPc: 0,
      newBalance: await getWalletBalance(childId),
    }
  }

  const lessonId = LESSONS[lessonIndex].id
  const quizPassed = newStars >= 1

  try {
    const existing = (await sql`
      SELECT stars, quiz_passed
      FROM lesson_progress
      WHERE child_id = ${childId} AND lesson_id = ${lessonId}
    `) as Array<{ stars: number; quiz_passed: boolean }>

    if (existing[0]) {
      await sql`
        UPDATE lesson_progress
        SET
          stars = ${Math.max(Number(existing[0].stars) || 0, newStars)},
          quiz_passed = ${quizPassed || Boolean(existing[0].quiz_passed)},
          completed_at = COALESCE(completed_at, ${quizPassed ? sql`now()` : null})
        WHERE child_id = ${childId} AND lesson_id = ${lessonId}
      `
    } else {
      await sql`
        INSERT INTO lesson_progress (child_id, lesson_id, quiz_passed, stars, completed_at)
        VALUES (
          ${childId},
          ${lessonId},
          ${quizPassed},
          ${newStars},
          ${quizPassed ? sql`now()` : null}
        )
      `
    }
  } catch {
    // table missing — keep in-memory update for the client
  }

  current[lessonIndex] = Math.max(previous, newStars)

  let rewardPc = 0
  if (newStars === 3 && previous < 3) {
    rewardPc = await getQuizRewardPc(childId)
    if (rewardPc > 0) {
      await sql`
        UPDATE wallets
        SET xp_balance = xp_balance + ${rewardPc}, updated_at = NOW()
        WHERE child_id = ${childId}
      `
      await logChildActivity(
        childId,
        "lesson_reward",
        `Lesson complete: ${LESSONS[lessonIndex].title}`,
        rewardPc,
        "completed"
      )

      const parentId = await getParentIdForChild(childId)
      if (parentId) {
        const childName = await getChildName(childId)
        await createNotification(
          parentId,
          `🎓 ${childName} completed a lesson`,
          `${childName} finished "${LESSONS[lessonIndex].title}" and earned ${rewardPc} PC`,
          "success"
        )
      }
    }
    try {
      await checkChallengeProgress(childId, "lesson_quiz")
    } catch {
      // non-fatal
    }
  }

  return {
    stars: current,
    investmentXp: investmentXpFromStars(current),
    rewardPc,
    newBalance: await getWalletBalance(childId),
  }
}
