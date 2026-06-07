"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { MapPin, Clock, X, ShoppingBag, Utensils, Gamepad2, Book, Film, Music, ShoppingCart, Fuel, Heart } from "lucide-react"

interface ParentApprovalAlertProps {
  isOpen: boolean
  onClose: () => void
  onApprove: (alwaysAllow: boolean) => void
  onDecline: () => void
  childName: string
  childAvatar?: string
  merchantName: string
  category: "food" | "shopping" | "gaming" | "books" | "entertainment" | "music" | "groceries" | "fuel" | "health"
  piggyCoins: number
  euroAmount: number
  location?: string
  timeoutSeconds?: number
}

const categoryConfig = {
  food: { icon: Utensils, label: "Food & Drinks", color: "bg-orange-100 text-orange-600" },
  shopping: { icon: ShoppingBag, label: "Shopping", color: "bg-blue-100 text-blue-600" },
  gaming: { icon: Gamepad2, label: "Gaming", color: "bg-purple-100 text-purple-600" },
  books: { icon: Book, label: "Books", color: "bg-emerald-100 text-emerald-600" },
  entertainment: { icon: Film, label: "Entertainment", color: "bg-pink-100 text-pink-600" },
  music: { icon: Music, label: "Music", color: "bg-indigo-100 text-indigo-600" },
  groceries: { icon: ShoppingCart, label: "Groceries", color: "bg-green-100 text-green-600" },
  fuel: { icon: Fuel, label: "Fuel", color: "bg-amber-100 text-amber-600" },
  health: { icon: Heart, label: "Health", color: "bg-red-100 text-red-600" },
}

export function ParentApprovalAlert({
  isOpen,
  onClose,
  onApprove,
  onDecline,
  childName,
  childAvatar,
  merchantName,
  category,
  piggyCoins,
  euroAmount,
  location,
  timeoutSeconds = 60,
}: ParentApprovalAlertProps) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds)
  const [alwaysAllow, setAlwaysAllow] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(timeoutSeconds)
      setAlwaysAllow(false)
      return
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onDecline()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, timeoutSeconds, onDecline])

  const handleApprove = useCallback(() => {
    onApprove(alwaysAllow)
  }, [onApprove, alwaysAllow])

  if (!isOpen) return null

  const CategoryIcon = categoryConfig[category].icon
  const categoryLabel = categoryConfig[category].label
  const categoryColor = categoryConfig[category].color
  const progressPercent = (timeLeft / timeoutSeconds) * 100

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-white rounded-t-3xl shadow-2xl max-w-lg mx-auto">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          <div className="px-6 pb-8">
            {/* Header */}
            <div className="text-center mb-6">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">
                Payment Request
              </p>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                Approval Needed
              </h2>
            </div>

            {/* Child info */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl mb-4">
              <Avatar className="w-12 h-12 ring-2 ring-white shadow-md">
                <AvatarImage src={childAvatar} alt={childName} />
                <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-semibold">
                  {childName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-slate-900">{childName}</p>
                <p className="text-sm text-slate-500">wants to make a purchase</p>
              </div>
            </div>

            {/* Transaction details */}
            <div className="bg-slate-900 rounded-2xl p-5 mb-4 text-white">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${categoryColor}`}>
                  <CategoryIcon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-white">{merchantName}</h3>
                  <p className="text-slate-400 text-sm">{categoryLabel}</p>
                  {location && (
                    <div className="flex items-center gap-1.5 mt-2 text-slate-400 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount */}
              <div className="mt-5 pt-4 border-t border-slate-700">
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-400">Amount</span>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-white">
                      {piggyCoins} PiggyCoins
                    </p>
                    <p className="text-slate-400 text-sm">
                      = {"\u20AC"}{euroAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Countdown timer */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">Time remaining</span>
                </div>
                <span className={`text-sm font-bold ${timeLeft <= 10 ? "text-red-500" : "text-slate-900"}`}>
                  {timeLeft}s
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${
                    timeLeft <= 10 ? "bg-red-500" : timeLeft <= 20 ? "bg-amber-500" : "bg-slate-900"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-5">
              <Button
                onClick={onDecline}
                variant="outline"
                className="flex-1 h-14 text-lg font-semibold border-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl"
              >
                Decline
              </Button>
              <Button
                onClick={handleApprove}
                className="flex-1 h-14 text-lg font-semibold bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/30"
              >
                Approve
              </Button>
            </div>

            {/* Always allow toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="font-medium text-slate-900 text-sm">Always allow this merchant</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Future purchases will be auto-approved
                </p>
              </div>
              <Switch
                checked={alwaysAllow}
                onCheckedChange={setAlwaysAllow}
                className="data-[state=checked]:bg-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
