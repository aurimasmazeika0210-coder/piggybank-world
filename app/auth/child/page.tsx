"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export default function ChildLoginPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState(["", "", "", "", "", ""])
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    let cancelled = false
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) {
          if (!cancelled) setChecking(false)
          return
        }
        const data = await r.json()
        if (cancelled) return
        if (data.userType === "child") {
          router.replace("/child")
          return
        }
        setChecking(false)
      })
      .catch(() => {
        if (!cancelled) setChecking(false)
      })
    return () => {
      cancelled = true
    }
  }, [router])

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1)
    if (value && !/^\d$/.test(value)) return
    const next = [...code]
    next[index] = value
    setCode(next)
    if (value && index < 5) refs[index + 1].current?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  const handleLogin = async () => {
    const loginCode = code.join("")
    if (loginCode.length !== 6) {
      setError("Enter all 6 digits of your login code")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/child-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginCode }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error ?? "Invalid login code")
        return
      }
      router.push("/child")
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">
      <div className="bg-card rounded-3xl shadow-xl p-8 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl mb-2">
            🐷
          </div>
          <h1 className="text-xl font-bold">Child Login</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Enter the 6-digit code from your parent&apos;s dashboard. It changes every 60 seconds.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          {code.map((digit, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono"
            />
          ))}
        </div>

        {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}

        <Button
          type="button"
          onClick={handleLogin}
          disabled={loading}
          className="w-full h-12 rounded-2xl"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log in"}
        </Button>

        <Link
          href="/auth"
          className="block w-full text-center text-sm text-muted-foreground hover:text-foreground mt-4"
        >
          Back to parent login
        </Link>
      </div>
    </div>
  )
}
