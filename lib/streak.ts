const STREAK_KEY = "piggy-streak"
const LAST_LESSON_KEY = "piggy-last-lesson-date"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getStreakState(): { count: number; lastDate: string | null } {
  if (typeof window === "undefined") return { count: 0, lastDate: null }
  const count = Number(localStorage.getItem(STREAK_KEY) ?? 0)
  const lastDate = localStorage.getItem(LAST_LESSON_KEY)
  return { count: Number.isFinite(count) ? count : 0, lastDate }
}

export function recordLessonCompletedToday(): number {
  if (typeof window === "undefined") return 0
  const today = todayKey()
  const { count, lastDate } = getStreakState()

  if (lastDate === today) {
    return count
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = yesterday.toISOString().slice(0, 10)

  let next = 1
  if (lastDate === yesterdayKey) {
    next = count + 1
  }

  localStorage.setItem(STREAK_KEY, String(next))
  localStorage.setItem(LAST_LESSON_KEY, today)
  return next
}

export function getStreakWeekDots(): boolean[] {
  const { count } = getStreakState()
  const filled = Math.min(7, Math.max(0, count))
  return Array.from({ length: 7 }, (_, i) => i < filled)
}
