"use client"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  CreditCard,
  ChevronLeft,
  Check,
  Sparkles,
  X,
  Coins,
  Bell,
} from "lucide-react"

export interface TopUpChild {
  id: string
  name: string
  avatar: string
  avatarEmoji?: string
  balance: number
  cardLastFour: string
  color: string
}

interface TopUpFlowProps {
  isOpen: boolean
  onClose: () => void
  children: TopUpChild[]
  onSuccess?: () => void
}

type Step = "select" | "confirm" | "success"

export function TopUpFlow({ isOpen, onClose, children, onSuccess }: TopUpFlowProps) {
  const [step, setStep] = useState<Step>("select")
  const [selectedChild, setSelectedChild] = useState<TopUpChild | null>(null)
  const [amount, setAmount] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newBalance, setNewBalance] = useState<number | null>(null)
  const wasOpenRef = useRef(false)

  // Reset form only when the modal opens — not when parent children list refreshes (OTP poll).
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setStep("select")
      setSelectedChild(children.length === 1 ? children[0] : null)
      setAmount("")
      setIsProcessing(false)
      setError(null)
      setNewBalance(null)
    }
    wasOpenRef.current = isOpen
  }, [isOpen, children])

  useEffect(() => {
    if (!isOpen || step !== "select") return
    setSelectedChild((prev) => {
      if (children.length === 1) return children[0]
      if (prev && children.some((c) => c.id === prev.id)) {
        return children.find((c) => c.id === prev.id) ?? prev
      }
      return prev
    })
  }, [children, isOpen, step])

  const euroAmount = parseFloat(amount) || 0
  const piggyCoins = Math.round(euroAmount * 10)

  const handleNumberPad = (value: string) => {
    if (value === "backspace") {
      setAmount((prev) => prev.slice(0, -1))
    } else if (value === ".") {
      if (!amount.includes(".")) {
        setAmount((prev) => prev + ".")
      }
    } else {
      const parts = amount.split(".")
      if (parts[1] && parts[1].length >= 2) return
      if (parseFloat(amount + value) > 500) return
      setAmount((prev) => prev + value)
    }
  }

  const handleQuickSelect = (value: number) => {
    setAmount(value.toFixed(2))
  }

  const adjustAmountByWheel = (deltaY: number) => {
    const step = deltaY < 0 ? 1 : -1
    const current = parseFloat(amount) || 0
    const next = Math.min(500, Math.max(0, Math.round((current + step) * 100) / 100))
    setAmount(next > 0 ? next.toFixed(2) : "")
  }

  const handleConfirmPayment = async () => {
    if (!selectedChild || piggyCoins < 1) return
    setIsProcessing(true)
    setError(null)
    try {
      const res = await fetch(`/api/parent/children/${selectedChild.id}/top-up`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ piggyCoins }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Payment failed")
        return
      }
      setNewBalance(data.newBalance)
      onSuccess?.()
      setStep("success")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  const displayBalance =
    newBalance ?? (selectedChild ? selectedChild.balance + piggyCoins : 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto overscroll-contain py-4"
      onWheel={(e) => e.stopPropagation()}
    >
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md mx-4 mb-4 sm:mb-0 max-h-[min(92dvh,720px)] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
        <Card className="bg-white rounded-3xl shadow-2xl overflow-hidden border-0 flex flex-col max-h-[min(92dvh,720px)]">
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            {step !== "select" && step !== "success" && (
              <button
                type="button"
                onClick={() => {
                  setStep("select")
                  setError(null)
                }}
                className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold flex-1 text-center">
              {step === "select" && "Add Funds"}
              {step === "confirm" && "Confirm Payment"}
              {step === "success" && "Funds Added!"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 rounded-full hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {step === "select" && (
            <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
              {children.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  Add a child first, then you can add funds to their card.
                </p>
              ) : (
                <>
                  <div className="mb-6">
                    <label className="text-sm font-medium text-slate-500 mb-3 block">
                      Who receives the money?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {children.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => setSelectedChild(child)}
                          className={`p-4 rounded-2xl border-2 transition-all ${
                            selectedChild?.id === child.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <Avatar className="w-12 h-12 mx-auto mb-2 ring-2 ring-white shadow">
                            <AvatarImage src={child.avatar} alt={child.name} />
                            <AvatarFallback
                              className={`bg-gradient-to-br ${child.color} text-white font-bold text-lg`}
                            >
                              {child.avatarEmoji ?? child.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <p className="font-semibold text-slate-900">{child.name}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Card **** {child.cardLastFour}
                          </p>
                          <p className="text-xs text-slate-500">
                            {child.balance} PC
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedChild && (
                    <>
                      <div className="bg-slate-100 rounded-2xl p-4 mb-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Current balance</span>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">
                              {selectedChild.balance} PiggyCoins
                            </p>
                            <p className="text-sm text-slate-500">
                              €{(selectedChild.balance / 10).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <label className="text-sm font-medium text-slate-500 mb-2 block">
                        How much do you want to add? (€1 = 10 PiggyCoins)
                      </label>
                      <div
                        className="text-center mb-4 select-none"
                        onWheel={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          adjustAmountByWheel(e.deltaY)
                        }}
                        title="Scroll to change amount"
                      >
                        <div className="text-4xl font-bold text-slate-900 mb-1">
                          €{amount || "0.00"}
                        </div>
                        <p className="text-xs text-slate-400 mb-1">Scroll wheel or use keypad</p>
                        {euroAmount > 0 && (
                          <div className="flex items-center justify-center gap-2 text-blue-600">
                            <Coins className="w-4 h-4" />
                            <span className="font-medium">= {piggyCoins} PiggyCoins</span>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {[5, 10, 20, 50].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => handleQuickSelect(value)}
                            className={`py-3 px-2 rounded-xl font-semibold transition-all ${
                              parseFloat(amount) === value
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            €{value}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-6">
                        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "backspace"].map(
                          (key) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleNumberPad(key)}
                              className="h-14 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors font-semibold text-xl text-slate-700 flex items-center justify-center"
                            >
                              {key === "backspace" ? (
                                <ChevronLeft className="w-6 h-6" />
                              ) : (
                                key
                              )}
                            </button>
                          )
                        )}
                      </div>

                      <Button
                        type="button"
                        onClick={() => setStep("confirm")}
                        disabled={euroAmount < 1}
                        className="w-full h-14 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-2xl disabled:opacity-50"
                      >
                        Continue
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {step === "confirm" && selectedChild && (
            <div className="p-6 overflow-y-auto overscroll-contain flex-1 min-h-0">
              <div className="bg-slate-50 rounded-2xl p-5 mb-6">
                <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-200">
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow">
                    <AvatarImage src={selectedChild.avatar} alt={selectedChild.name} />
                    <AvatarFallback
                      className={`bg-gradient-to-br ${selectedChild.color} text-white font-bold text-lg`}
                    >
                      {selectedChild.avatarEmoji ?? selectedChild.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedChild.name}</p>
                    <p className="text-sm text-slate-500">
                      Card ending in {selectedChild.cardLastFour}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">You pay</span>
                    <span className="font-bold text-slate-900 text-lg">
                      €{euroAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Child receives</span>
                    <span className="font-bold text-blue-600 text-lg flex items-center gap-1">
                      <Coins className="w-5 h-5" />
                      {piggyCoins} PC
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-slate-600">New balance</span>
                    <span className="font-bold text-emerald-600">
                      {selectedChild.balance + piggyCoins} PC
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center mb-4">
                Demo mode: funds are added instantly (no real card charge).
              </p>

              {error && (
                <p className="text-sm text-red-600 text-center mb-4">{error}</p>
              )}

              <Button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isProcessing}
                className="w-full h-14 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Adding funds...
                  </div>
                ) : (
                  <>Add {piggyCoins} PiggyCoins</>
                )}
              </Button>
            </div>
          )}

          {step === "success" && selectedChild && (
            <div className="p-6 text-center overflow-y-auto overscroll-contain flex-1 min-h-0">
              <div className="relative mb-6">
                <div className="w-24 h-24 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                  <Check className="w-12 h-12 text-emerald-600" />
                </div>
                <Sparkles className="absolute top-0 left-1/4 w-6 h-6 text-amber-400 animate-pulse" />
              </div>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Funds added!</h3>
              <p className="text-slate-600 mb-6">
                {piggyCoins} PiggyCoins were added to {selectedChild.name}&apos;s card
              </p>

              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 mb-6 text-white">
                <p className="text-emerald-100 text-sm mb-1">New balance</p>
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-7 h-7" />
                  <span className="text-4xl font-bold">{displayBalance}</span>
                  <span className="text-xl">PiggyCoins</span>
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 mb-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm text-blue-700 text-left">
                  {selectedChild.name} will see the new balance when they open their app.
                </p>
              </div>

              <Button
                type="button"
                onClick={onClose}
                className="w-full h-14 text-lg font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-2xl"
              >
                Done
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
