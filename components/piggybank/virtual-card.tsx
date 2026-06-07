"use client"

import { formatEuros } from "@/lib/currency"
import { getCardGradientStyle } from "@/lib/theme"
import { cn } from "@/lib/utils"

interface VirtualCardProps {
  childName: string
  cardNumber: string
  balance?: number
  isFrozen?: boolean
  cardGradientId?: string
}

export function VirtualCard({
  childName,
  cardNumber,
  balance = 0,
  isFrozen = false,
  cardGradientId = "pink-purple",
}: VirtualCardProps) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[1.586/1] rounded-2xl p-5 overflow-hidden shadow-xl transition-all duration-300",
        isFrozen && "grayscale opacity-80"
      )}
      style={{
        background: getCardGradientStyle(cardGradientId),
      }}
    >
      {/* Card pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 400 250">
          <pattern id="circles" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="20" cy="20" r="8" fill="white" />
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#circles)" />
        </svg>
      </div>

      {/* PiggyBank World Logo */}
      <div className="absolute top-5 left-5 flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-lg">🐷</span>
        </div>
        <span className="text-white font-bold text-sm">Road to success</span>
      </div>

      {/* Mastercard Logo */}
      <div className="absolute top-5 right-5">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-red-500 opacity-90" />
          <div className="w-6 h-6 rounded-full bg-yellow-500 opacity-90" />
        </div>
      </div>

      {/* Chip */}
      <div className="absolute top-14 left-5">
        <div className="w-10 h-7 rounded-md bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center">
          <div className="w-7 h-5 border-2 border-yellow-600/30 rounded-sm" />
        </div>
      </div>

      {/* Card Number */}
      <div className="absolute bottom-16 left-5 right-5">
        <p className="text-white/70 text-xs mb-1 font-medium">Card Number</p>
        <p className="text-white font-mono text-lg tracking-widest">{cardNumber}</p>
      </div>

      {/* Cardholder Name */}
      <div className="absolute bottom-5 left-5">
        <p className="text-white/70 text-xs mb-1 font-medium">Cardholder</p>
        <p className="text-white font-semibold text-base uppercase">{childName}</p>
      </div>

      {/* Balance */}
      <div className="absolute bottom-5 right-5 text-right">
        <p className="text-white/70 text-xs mb-1 font-medium">Balance</p>
        <p className="text-white font-bold text-lg">{formatEuros(balance)}</p>
      </div>

      {/* Frozen overlay */}
      {isFrozen && (
        <div className="absolute inset-0 bg-blue-900/40 flex items-center justify-center">
          <div className="bg-white/90 px-4 py-2 rounded-full flex items-center gap-2">
            <span className="text-2xl">❄️</span>
            <span className="font-bold text-blue-800">FROZEN</span>
          </div>
        </div>
      )}
    </div>
  )
}
