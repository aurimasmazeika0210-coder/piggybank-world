"use client"

import { useEffect, useState, useCallback } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import confetti from "canvas-confetti"

type PaymentStatus = "processing" | "approved" | "blocked"

interface PaymentProcessingModalProps {
  isOpen: boolean
  onClose: () => void
  merchant: string
  categoryIcon: string
  amount: number
  simulateResult?: "approved" | "blocked"
  blockedReason?: string
}

export function PaymentProcessingModal({
  isOpen,
  onClose,
  merchant,
  categoryIcon,
  amount,
  simulateResult = "approved",
  blockedReason = "Gaming purchases are turned off. Ask your parent to enable it.",
}: PaymentProcessingModalProps) {
  const [status, setStatus] = useState<PaymentStatus>("processing")
  const [timeLeft, setTimeLeft] = useState(60)
  const [progress, setProgress] = useState(100)

  const triggerConfetti = useCallback(() => {
    const duration = 3000
    const end = Date.now() + duration

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#ec4899", "#a855f7", "#fbbf24", "#34d399"],
      })
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#ec4899", "#a855f7", "#fbbf24", "#34d399"],
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setStatus("processing")
      setTimeLeft(60)
      setProgress(100)
      return
    }

    // Simulate payment processing - resolve after 3-5 seconds for demo
    const resolveTime = Math.random() * 2000 + 3000
    const resolveTimer = setTimeout(() => {
      setStatus(simulateResult)
      if (simulateResult === "approved") {
        triggerConfetti()
      }
    }, resolveTime)

    return () => clearTimeout(resolveTimer)
  }, [isOpen, simulateResult, triggerConfetti])

  useEffect(() => {
    if (!isOpen || status !== "processing") return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
      setProgress((prev) => Math.max(0, prev - 100 / 60))
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, status])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-md">
      <div className="relative w-full h-full flex flex-col items-center justify-center p-6">
        {/* Close Button */}
        {status !== "processing" && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-card/80 hover:bg-card z-10"
          >
            <X className="w-6 h-6" />
          </Button>
        )}

        {/* Processing State */}
        {status === "processing" && (
          <div className="flex flex-col items-center text-center animate-in fade-in duration-300">
            {/* Animated Spinning Coin */}
            <div className="relative w-32 h-32 mb-8">
              <div className="absolute inset-0 animate-spin-slow">
                <div className="w-full h-full rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 shadow-2xl flex items-center justify-center border-4 border-amber-200">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center border-2 border-amber-300">
                    <span className="text-4xl font-bold text-amber-900">P</span>
                  </div>
                </div>
              </div>
              {/* Coin shine effect */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/30 to-transparent animate-pulse" />
            </div>

            {/* Waiting Text */}
            <h2 className="text-2xl font-bold text-card mb-2">Waiting for approval...</h2>
            <p className="text-card/80 mb-8">Your parent is checking this purchase</p>

            {/* Merchant Info Card */}
            <div className="bg-card rounded-3xl p-6 shadow-2xl mb-8 w-full max-w-xs">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <span className="text-3xl">{categoryIcon}</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-foreground text-lg">{merchant}</p>
                  <p className="text-muted-foreground text-sm">wants to charge</p>
                </div>
              </div>
              <div className="text-center py-3 bg-primary/5 rounded-2xl">
                <span className="text-3xl font-bold text-primary">{amount}</span>
                <span className="text-lg text-primary ml-2">PiggyCoins</span>
              </div>
            </div>

            {/* Countdown Timer */}
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm text-card/80 mb-2">
                <span>Time remaining</span>
                <span className="font-bold">{timeLeft}s</span>
              </div>
              <div className="h-3 bg-card/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Approved State */}
        {status === "approved" && (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-500">
            {/* Success Circle */}
            <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30">
              <svg
                className="w-16 h-16 text-white animate-in zoom-in duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {/* Approved Text */}
            <h2 className="text-3xl font-bold text-card mb-4">Approved!</h2>

            {/* Result Card */}
            <div className="bg-card rounded-3xl p-6 shadow-2xl w-full max-w-xs mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">{categoryIcon}</span>
                <span className="font-bold text-foreground text-lg">{merchant}</span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 px-4 bg-rose-50 rounded-2xl">
                  <span className="text-muted-foreground">Spent</span>
                  <span className="font-bold text-primary">{amount} PiggyCoins</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-emerald-50 rounded-2xl">
                  <span className="text-muted-foreground">Earned</span>
                  <span className="font-bold text-emerald-600">+{amount} coins</span>
                </div>
              </div>
            </div>

            {/* Celebration Message */}
            <p className="text-card/90 text-lg font-medium mb-6">Great job managing your money!</p>

            <Button
              onClick={onClose}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-full px-8 py-6 text-lg font-bold shadow-lg"
            >
              Awesome!
            </Button>
          </div>
        )}

        {/* Blocked State */}
        {status === "blocked" && (
          <div className="flex flex-col items-center text-center animate-in zoom-in-95 fade-in duration-500">
            {/* Blocked Circle */}
            <div className="w-32 h-32 rounded-full bg-rose-500 flex items-center justify-center mb-6 shadow-2xl shadow-rose-500/30">
              <svg
                className="w-16 h-16 text-white animate-in zoom-in duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>

            {/* Blocked Text */}
            <h2 className="text-3xl font-bold text-card mb-4">Blocked</h2>

            {/* Info Card */}
            <div className="bg-card rounded-3xl p-6 shadow-2xl w-full max-w-xs mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <span className="text-3xl">{categoryIcon}</span>
                <span className="font-bold text-foreground text-lg">{merchant}</span>
              </div>
              
              <div className="py-4 px-4 bg-rose-50 rounded-2xl mb-4">
                <span className="font-bold text-rose-600">{amount} PiggyCoins</span>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border-2 border-amber-200">
                <p className="text-amber-800 text-sm font-medium">{blockedReason}</p>
              </div>
            </div>

            {/* Friendly Message */}
            <p className="text-card/90 text-lg font-medium mb-6">{"Don't worry, your coins are safe!"}</p>

            <Button
              onClick={onClose}
              className="bg-card hover:bg-card/90 text-foreground rounded-full px-8 py-6 text-lg font-bold shadow-lg"
            >
              Got it
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
