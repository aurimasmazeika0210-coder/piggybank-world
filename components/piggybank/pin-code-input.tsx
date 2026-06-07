"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"

interface PinCodeInputProps {
  length?: number
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  className?: string
}

export function PinCodeInput({
  length = 4,
  value,
  onChange,
  disabled,
  className,
}: PinCodeInputProps) {
  const refs = Array.from({ length }, () => useRef<HTMLInputElement>(null))

  const handleChange = (index: number, raw: string) => {
    let v = raw
    if (v.length > 1) v = v.slice(-1)
    if (v && !/^\d$/.test(v)) return
    const next = [...value]
    while (next.length < length) next.push("")
    next[index] = v
    onChange(next.slice(0, length))
    if (v && index < length - 1) refs[index + 1].current?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  return (
    <div className={cn("flex justify-center gap-3", className)}>
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none"
        />
      ))}
    </div>
  )
}
