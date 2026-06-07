"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CARD_GRADIENT_PRESETS, CARD_COLOR_STORAGE_KEY } from "@/lib/theme"

interface ChildSettingsSheetProps {
  open: boolean
  onClose: () => void
  cardColorId: string
  onCardColorChange: (id: string) => void
}

export function ChildSettingsSheet({
  open,
  onClose,
  cardColorId,
  onCardColorChange,
}: ChildSettingsSheetProps) {
  const [draftCardColor, setDraftCardColor] = useState(cardColorId)

  useEffect(() => {
    if (open) {
      setDraftCardColor(cardColorId)
    }
  }, [open, cardColorId])

  if (!open) return null

  const hasCardColorChange = draftCardColor !== cardColorId

  const handleDone = () => {
    if (hasCardColorChange) {
      localStorage.setItem(CARD_COLOR_STORAGE_KEY, draftCardColor)
      onCardColorChange(draftCardColor)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-card text-card-foreground rounded-t-3xl w-full max-w-md border-t border-border flex flex-col max-h-[min(85vh,640px)] animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center px-6 pt-6 pb-3 shrink-0">
          <h2 className="font-bold text-lg">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-4 scroll-smooth">
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Card Colour</h3>
            <div
              className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 snap-x snap-mandatory"
              style={{ scrollbarWidth: "thin" }}
            >
              {CARD_GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDraftCardColor(preset.id)}
                  className={cn(
                    "shrink-0 rounded-lg border-2 transition-all snap-start",
                    draftCardColor === preset.id ? "border-primary scale-105" : "border-transparent"
                  )}
                  style={{ width: 60, height: 36, background: preset.style }}
                  aria-label={preset.label}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Swipe sideways to see all colours</p>
          </section>

          <section className="mb-4">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Language</h3>
            <select
              disabled
              className="w-full px-4 py-3 rounded-xl border bg-muted text-muted-foreground text-sm"
              value="en"
            >
              <option value="en">English</option>
            </select>
            <p className="text-xs text-muted-foreground mt-2">More languages coming soon</p>
          </section>
        </div>

        <div className="shrink-0 px-6 pb-6 pt-2 border-t border-border bg-card">
          <Button
            type="button"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white"
            onClick={handleDone}
          >
            {hasCardColorChange ? "Save card colour" : "Done"}
          </Button>
        </div>
      </div>
    </div>
  )
}
