"use client"



import { useState, useEffect } from "react"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

import { Loader2 } from "lucide-react"



type Tab = "login" | "signup"

type SessionState = "checking" | "guest" | "redirecting"



export default function AuthPage() {

  const router = useRouter()

  const [sessionState, setSessionState] = useState<SessionState>("checking")

  const [tab, setTab] = useState<Tab>("login")

  const [loading, setLoading] = useState(false)

  const [error, setError] = useState<string | null>(null)



  const [loginEmail, setLoginEmail] = useState("")

  const [loginPassword, setLoginPassword] = useState("")



  const [signupName, setSignupName] = useState("")

  const [signupEmail, setSignupEmail] = useState("")

  const [signupPassword, setSignupPassword] = useState("")

  const [signupConfirm, setSignupConfirm] = useState("")

  const [signupErrors, setSignupErrors] = useState<Record<string, string>>({})



  useEffect(() => {

    let cancelled = false



    fetch("/api/auth/me")

      .then(async (r) => {

        if (!r.ok) {

          if (!cancelled) setSessionState("guest")

          return

        }

        const data = await r.json()

        if (cancelled) return

        setSessionState("redirecting")

        if (data.userType === "parent") router.replace("/parent")

        else if (data.userType === "child") router.replace("/child")

        else if (!cancelled) setSessionState("guest")

      })

      .catch(() => {

        if (!cancelled) setSessionState("guest")

      })



    return () => {

      cancelled = true

    }

  }, [router])



  const handleLogoutAndStay = async () => {

    await fetch("/api/auth/logout", { method: "POST" })

    setSessionState("guest")

    setError(null)

  }



  const handleParentLogin = async (e: React.FormEvent) => {

    e.preventDefault()

    setError(null)

    setLoading(true)

    try {

      const res = await fetch("/api/auth/login", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ email: loginEmail, password: loginPassword }),

      })

      const data = await res.json()

      if (!data.success) {

        setError(data.error ?? "Login failed")

        return

      }

      router.push("/parent")

    } catch {

      setError("Something went wrong. Please try again.")

    } finally {

      setLoading(false)

    }

  }



  const handleSignup = async (e: React.FormEvent) => {

    e.preventDefault()

    const errors: Record<string, string> = {}

    if (!signupName.trim()) errors.name = "Name is required"

    if (!signupEmail.trim()) errors.email = "Email is required"

    if (signupPassword.length < 8) errors.password = "Password must be at least 8 characters"

    if (signupPassword !== signupConfirm) errors.confirm = "Passwords do not match"

    setSignupErrors(errors)

    if (Object.keys(errors).length > 0) return



    setError(null)

    setLoading(true)

    try {

      const res = await fetch("/api/auth/signup", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          name: signupName,

          email: signupEmail,

          password: signupPassword,

        }),

      })

      const data = await res.json()

      if (!data.success) {

        setError(data.error ?? "Signup failed")

        return

      }

      router.push("/parent")

    } catch {

      setError("Something went wrong. Please try again.")

    } finally {

      setLoading(false)

    }

  }



  const inputClass =

    "w-full h-12 rounded-2xl border border-border bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"



  if (sessionState === "checking" || sessionState === "redirecting") {

    return (

      <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex flex-col items-center justify-center p-4 gap-3">

        <Loader2 className="w-8 h-8 animate-spin text-primary" />

        <p className="text-sm text-muted-foreground">

          {sessionState === "redirecting" ? "Already signed in, redirecting…" : "Loading…"}

        </p>

        {sessionState === "redirecting" && (

          <Button type="button" variant="outline" size="sm" onClick={handleLogoutAndStay}>

            Sign in as someone else

          </Button>

        )}

      </div>

    )

  }



  return (

    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center p-4">

      <div

        className="relative z-10 bg-card rounded-3xl shadow-xl p-8 w-full max-w-sm pointer-events-auto"

        role="main"

      >

        <div className="flex flex-col items-center mb-6">

          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-3xl mb-2">

            🐷

          </div>

          <h1 className="text-xl font-bold">Road to success</h1>

        </div>

        <>
            <div className="flex gap-2 mb-6 p-1 bg-secondary rounded-full">

              <button

                type="button"

                onClick={() => {

                  setTab("login")

                  setError(null)

                }}

                className={cn(

                  "flex-1 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer",

                  tab === "login" ? "bg-card shadow text-foreground" : "text-muted-foreground"

                )}

              >

                Login

              </button>

              <button

                type="button"

                onClick={() => {

                  setTab("signup")

                  setError(null)

                }}

                className={cn(

                  "flex-1 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer",

                  tab === "signup" ? "bg-card shadow text-foreground" : "text-muted-foreground"

                )}

              >

                Sign up

              </button>

            </div>

            {tab === "login" ? (

              <form onSubmit={handleParentLogin} className="space-y-4">

                <input

                  type="email"

                  placeholder="Email"

                  value={loginEmail}

                  onChange={(e) => setLoginEmail(e.target.value)}

                  className={inputClass}

                  required

                  autoComplete="email"

                />

                <input

                  type="password"

                  placeholder="Password"

                  value={loginPassword}

                  onChange={(e) => setLoginPassword(e.target.value)}

                  className={inputClass}

                  required

                  autoComplete="current-password"

                />

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl">

                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Login as Parent"}

                </Button>

              </form>

            ) : (

              <form onSubmit={handleSignup} className="space-y-4">

                <div>

                  <input

                    type="text"

                    placeholder="Full name"

                    value={signupName}

                    onChange={(e) => setSignupName(e.target.value)}

                    className={inputClass}

                  />

                  {signupErrors.name && (

                    <p className="text-sm text-destructive mt-1">{signupErrors.name}</p>

                  )}

                </div>

                <div>

                  <input

                    type="email"

                    placeholder="Email"

                    value={signupEmail}

                    onChange={(e) => setSignupEmail(e.target.value)}

                    className={inputClass}

                  />

                  {signupErrors.email && (

                    <p className="text-sm text-destructive mt-1">{signupErrors.email}</p>

                  )}

                </div>

                <div>

                  <input

                    type="password"

                    placeholder="Password (min 8 chars)"

                    value={signupPassword}

                    onChange={(e) => setSignupPassword(e.target.value)}

                    className={inputClass}

                  />

                  {signupErrors.password && (

                    <p className="text-sm text-destructive mt-1">{signupErrors.password}</p>

                  )}

                </div>

                <div>

                  <input

                    type="password"

                    placeholder="Confirm password"

                    value={signupConfirm}

                    onChange={(e) => setSignupConfirm(e.target.value)}

                    className={inputClass}

                  />

                  {signupErrors.confirm && (

                    <p className="text-sm text-destructive mt-1">{signupErrors.confirm}</p>

                  )}

                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button type="submit" disabled={loading} className="w-full h-12 rounded-2xl">

                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Parent Account"}

                </Button>

              </form>

            )}

            <div className="flex items-center gap-3 my-6">

              <div className="flex-1 h-px bg-border" />

              <span className="text-sm text-muted-foreground">or</span>

              <div className="flex-1 h-px bg-border" />

            </div>

            <Button type="button" variant="outline" className="w-full h-12 rounded-2xl" asChild>
              <Link href="/auth/child">I am a child — log in with code</Link>
            </Button>
        </>

      </div>

    </div>

  )

}


