"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PinCodeInput } from "@/components/piggybank/pin-code-input"

interface PinRevealSheetsProps {
  showRequest: boolean
  showSuccess: boolean
  pin: string | null
  error: string | null
  verifying: boolean
  code: string[]
  onCodeChange: (code: string[]) => void
  onCloseRequest: () => void
  onCloseSuccess: () => void
  onVerify: () => void
}

export function PinRevealSheets({
  showRequest,
  showSuccess,
  pin,
  error,
  verifying,
  code,
  onCodeChange,
  onCloseRequest,
  onCloseSuccess,
  onVerify,
}: PinRevealSheetsProps) {
  if (!showRequest && !showSuccess) return null

  if (showSuccess && pin) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
        <div className="bg-card rounded-t-3xl w-full max-w-md p-6 text-center animate-in slide-in-from-bottom duration-300">
          <div className="flex justify-end mb-2">
            <button type="button" onClick={onCloseSuccess} className="text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <span className="text-4xl block mb-3">🔓</span>
          <p className="text-muted-foreground text-sm mb-2">Your PIN is</p>
          <p className="text-4xl font-bold tracking-[0.3em] mb-4">{pin}</p>
          <p className="text-xs text-muted-foreground">Do not share your PIN with anyone except your parent.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
      <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-lg">View PIN</h3>
          <button type="button" onClick={onCloseRequest} className="text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-muted-foreground mb-6 text-center">
          Ask your parent for a one-time code to reveal your PIN.
        </p>
        <PinCodeInput value={code} onChange={onCodeChange} disabled={verifying} className="mb-4" />
        {error && <p className="text-sm text-destructive text-center mb-4">{error}</p>}
        <Button
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white"
          disabled={verifying || code.join("").length !== 4}
          onClick={onVerify}
        >
          {verifying ? "Checking…" : "Reveal PIN"}
        </Button>
      </div>
    </div>
  )
}
