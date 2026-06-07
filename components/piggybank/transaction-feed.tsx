"use client"

import { Badge } from "@/components/ui/badge"

interface Transaction {
  id: string
  merchant: string
  category: string
  categoryIcon: string
  amount: number
  direction?: "in" | "out"
  time: string
  status: "approved" | "blocked" | "completed"
}

interface TransactionFeedProps {
  transactions: Transaction[]
}

function statusLabel(status: Transaction["status"]): string {
  if (status === "completed") return "Completed"
  if (status === "approved") return "Approved"
  return "Blocked"
}

function statusClass(status: Transaction["status"]): string {
  if (status === "blocked") {
    return "bg-destructive text-destructive-foreground border-0 text-[10px] px-2 py-0.5"
  }
  if (status === "completed") {
    return "bg-primary/15 text-primary border-0 text-[10px] px-2 py-0.5"
  }
  return "bg-success text-success-foreground border-0 text-[10px] px-2 py-0.5"
}

export function TransactionFeed({ transactions }: TransactionFeedProps) {
  return (
    <div className="bg-card rounded-2xl p-5 shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Recent Activity</h3>
        <span className="text-2xl">📜</span>
      </div>

      <div className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
        ) : (
          transactions.map((tx) => {
            const isLessonReward =
              tx.category.toLowerCase().includes("lesson") ||
              tx.category === "lesson_reward"
            const isIn = tx.direction === "in" || isLessonReward
            const prefix = isIn ? "+" : tx.status === "blocked" ? "" : "-"
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl"
              >
                <div className="w-11 h-11 rounded-full bg-card flex items-center justify-center text-xl shadow-sm">
                  {tx.categoryIcon}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{tx.merchant}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.category.replace(/_/g, " ")} • {tx.time}
                  </p>
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  <span
                    className={`font-bold whitespace-nowrap ${
                      isIn || isLessonReward ? "text-emerald-600" : "text-foreground"
                    }`}
                  >
                    {prefix}
                    {tx.amount} 🪙
                  </span>
                  <Badge className={statusClass(tx.status)}>{statusLabel(tx.status)}</Badge>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
