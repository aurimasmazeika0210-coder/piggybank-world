"use client"

import { Button } from "@/components/ui/button"
import { Snowflake, Lock, Settings } from "lucide-react"

interface QuickActionsProps {
  isFrozen: boolean
  onFreezeToggle: () => void
  onViewPin: () => void
  onSettings: () => void
}

export function QuickActions({ isFrozen, onFreezeToggle, onViewPin, onSettings }: QuickActionsProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <Button
        variant="secondary"
        className="h-auto flex-col gap-2 py-4 rounded-2xl bg-secondary hover:bg-secondary/80"
        onClick={onFreezeToggle}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isFrozen ? "bg-blue-100 text-blue-600" : "bg-primary/10 text-primary"}`}>
          <Snowflake className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-foreground text-center leading-tight">
          {isFrozen ? "Frozen — ask parent" : "Freeze Card"}
        </span>
      </Button>

      <Button
        variant="secondary"
        className="h-auto flex-col gap-2 py-4 rounded-2xl bg-secondary hover:bg-secondary/80"
        onClick={onViewPin}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Lock className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-foreground">View PIN</span>
      </Button>

      <Button
        variant="secondary"
        className="h-auto flex-col gap-2 py-4 rounded-2xl bg-secondary hover:bg-secondary/80"
        onClick={onSettings}
      >
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Settings className="w-5 h-5" />
        </div>
        <span className="text-xs font-medium text-foreground">Settings</span>
      </Button>
    </div>
  )
}
