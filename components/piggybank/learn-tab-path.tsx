"use client"

import { useEffect, useState } from "react"
import { Check, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { LessonDefinition } from "@/lib/lessons-data"
import { isLessonUnlocked } from "@/lib/lessons-data"
import { getStreakState, getStreakWeekDots } from "@/lib/streak"

interface LearnTabPathProps {
  lessons: LessonDefinition[]
  lessonStars: number[]
  investmentXp: number
  onSelectLesson: (index: number) => void
}

export function LearnTabPath({
  lessons,
  lessonStars,
  investmentXp,
  onSelectLesson,
}: LearnTabPathProps) {
  const [streakCount, setStreakCount] = useState(0)
  const [weekDots, setWeekDots] = useState<boolean[]>(() =>
    Array.from({ length: 7 }, () => false)
  )

  useEffect(() => {
    setStreakCount(getStreakState().count)
    setWeekDots(getStreakWeekDots())
  }, [])

  const level = Math.max(1, Math.floor(investmentXp / 100) + 1)
  const xpInLevel = investmentXp % 100
  const lessonsCompleted = lessonStars.filter((s) => s >= 3).length

  const alignments = ["justify-start", "justify-center", "justify-end"] as const

  return (
    <>
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 text-white mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-3xl">🔥</span>
            <p className="font-bold text-lg">
              {streakCount > 0 ? `${streakCount} Day Streak!` : "Start your streak!"}
            </p>
            <p className="text-white/90 text-xs">
              {streakCount > 0
                ? "Come back tomorrow to keep it going"
                : "Complete a lesson today to begin"}
            </p>
          </div>
          <div className="flex gap-1.5">
            {weekDots.map((filled, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full border",
                  filled
                    ? "bg-orange-300 border-orange-200"
                    : i === weekDots.filter(Boolean).length
                      ? "bg-white border-white"
                      : "bg-white/20 border-white/40"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl p-4 border mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="font-semibold text-sm">
            Level {level} — Junior Investor 🌱
          </p>
          <p className="text-xs text-muted-foreground">
            {xpInLevel} / 100 XP
          </p>
        </div>
        <Progress value={xpInLevel} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2">
          {lessonsCompleted} of {lessons.length} lessons with stars
        </p>
      </div>

      <div className="space-y-8 pb-4">
        {lessons.map((lesson, i) => {
          const stars = lessonStars[i] ?? 0
          const isCompleted = stars >= 3
          const isUnlocked = isLessonUnlocked(i, lessonStars)
          const isCurrent =
            isUnlocked &&
            !isCompleted &&
            (i === 0 || (lessonStars[i - 1] ?? 0) >= 1 || i === 2)

          return (
            <div
              key={lesson.id}
              className={cn("flex flex-col items-center", alignments[i % 3])}
            >
              <button
                type="button"
                disabled={!isUnlocked}
                onClick={() => isUnlocked && onSelectLesson(i)}
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-2xl border-4 transition-all shadow-lg",
                  isCompleted && "bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300",
                  isUnlocked &&
                    !isCompleted &&
                    "bg-gradient-to-br from-primary to-accent border-primary/50",
                  !isUnlocked && "bg-muted border-border opacity-60",
                  isCurrent && "ring-4 ring-primary/40 animate-pulse"
                )}
              >
                {!isUnlocked ? (
                  <Lock className="w-6 h-6 text-muted-foreground" />
                ) : isCompleted ? (
                  <Check className="w-7 h-7 text-white" />
                ) : (
                  lesson.emoji
                )}
              </button>
              <p className="text-xs font-medium text-center mt-2 max-w-[100px] leading-tight">
                {lesson.title}
              </p>
              <Badge className="mt-1 bg-amber-100 text-amber-800 border-0 text-[10px]">
                {lesson.xp} XP
              </Badge>
              {stars > 0 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{stars}★</p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
