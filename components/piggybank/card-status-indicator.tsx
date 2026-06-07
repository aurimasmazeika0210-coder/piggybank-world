"use client"

import { cn } from "@/lib/utils"

interface CardStatusIndicatorProps {
  isActive: boolean
}

export function CardStatusIndicator({ isActive }: CardStatusIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-4 px-6 rounded-2xl transition-colors",
        isActive ? "bg-success/10" : "bg-destructive/10"
      )}
    >
      <div
        className={cn(
          "w-3 h-3 rounded-full",
          isActive
            ? "bg-success animate-pulse-glow"
            : "bg-destructive"
        )}
      />
      <span
        className={cn(
          "font-semibold",
          isActive ? "text-success" : "text-destructive"
        )}
      >
        {isActive ? "Card is Active" : "Card Frozen"}
      </span>
    </div>
  )
}
