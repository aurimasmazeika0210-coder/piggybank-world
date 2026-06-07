"use client"

import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface SpendingTrackerProps {
  used: number
  limit: number
  categories: { name: string; icon: string }[]
}

export function SpendingTracker({ used, limit, categories }: SpendingTrackerProps) {
  const safeLimit = Math.max(limit, 1)
  const remaining = Math.max(0, safeLimit - used)
  const remainingPercent = (remaining / safeLimit) * 100

  const barColor =
    remainingPercent > 60
      ? "[&>div]:bg-emerald-500"
      : remainingPercent > 30
        ? "[&>div]:bg-amber-500"
        : "[&>div]:bg-red-500"

  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground">{"Today's Spending"}</h3>
        <span className="text-2xl">🪙</span>
      </div>

      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          {used === 0 ? (
            <span className="text-lg font-bold text-emerald-600">
              All {safeLimit} PC available 🎉
            </span>
          ) : (
            <span className="text-3xl font-bold text-foreground">{remaining}</span>
          )}
          {used > 0 && (
            <span className="text-sm text-muted-foreground">PC remaining today</span>
          )}
        </div>
        {used > 0 && (
          <p className="text-xs text-muted-foreground mb-2">
            of {safeLimit} PiggyCoins daily limit
          </p>
        )}
        <Progress value={remainingPercent} className={cn("h-3 bg-secondary", barColor)} />
        <p className="text-xs text-muted-foreground mt-2">Spent {used} PC today</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <span
            key={cat.name}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary rounded-full text-xs font-medium text-secondary-foreground"
          >
            <span>{cat.icon}</span>
            {cat.name}
          </span>
        ))}
      </div>
    </div>
  )
}
