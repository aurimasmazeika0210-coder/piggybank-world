"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { VirtualCard } from "@/components/piggybank/virtual-card"
import { QuickActions } from "@/components/piggybank/quick-actions"
import { SpendingTracker } from "@/components/piggybank/spending-tracker"
import { TransactionFeed } from "@/components/piggybank/transaction-feed"
import { CardStatusIndicator } from "@/components/piggybank/card-status-indicator"
import { PaymentProcessingModal } from "@/components/piggybank/payment-processing-modal"
import { ChildSettingsSheet } from "@/components/piggybank/child-settings-sheet"
import { PinRevealSheets } from "@/components/piggybank/pin-reveal-sheets"
import { LearnTabPath } from "@/components/piggybank/learn-tab-path"
import { LogOut, Bell, RefreshCw, Star, TrendingUp, TrendingDown, Lock, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { NotificationPanel } from "@/components/piggybank/notification-panel"
import {
  getWalletTransactions,
  getSpendingToday,
  getChildProfile,
  getChildPortfolio,
  getMarketPrices,
  buyShares,
  sellShares,
  setCardFrozen,
  getChildGoals,
  createChildGoal,
  contributeToGoal,
  completeParentTask,
  getChildNotifications,
  markChildNotificationsRead,
  getLessonProgress,
  saveLessonProgress,
  getChallenges,
  requestPinReveal,
  type ChildNotification,
  type Transaction,
  type SpendingData,
  type ChildProfile,
  type SavingsGoal,
} from "@/lib/api-client"
import {
  LESSONS,
  LESSON_BATCH_SIZE,
  emptyLessonStars,
  investmentXpFromStars,
  isLessonUnlocked,
  unlockHint,
} from "@/lib/lessons-data"
import { buildInvestmentWhy } from "@/lib/market-news"
import { applyChildTheme, loadStoredCardColor } from "@/lib/theme"
import { recordLessonCompletedToday } from "@/lib/streak"

const COMPANY_GRADIENTS = [
  "from-orange-400 to-rose-400",
  "from-blue-400 to-indigo-500",
  "from-pink-400 to-purple-400",
  "from-emerald-400 to-teal-400",
  "from-amber-400 to-orange-500",
  "from-violet-400 to-indigo-500",
] as const

interface MarketCompanyDisplay {
  id: string
  name: string
  emoji: string
  price: number
  change: number
  history: number[]
  news: string
  gradient: string
}

type TabId = "card" | "learn" | "goals" | "score" | "challenges"

interface Tab {
  id: TabId
  label: string
  icon: string
  title: string
}

const tabs: Tab[] = [
  { id: "card", label: "Card", icon: "💳", title: "My Card" },
  { id: "learn", label: "Learn", icon: "🎓", title: "Investment Academy" },
  { id: "goals", label: "Goals", icon: "🎯", title: "Savings Goals" },
  { id: "score", label: "Score", icon: "⭐", title: "Trusty Score" },
  { id: "challenges", label: "Challenges", icon: "🏆", title: "Weekly Challenges" },
]

// Skeleton components for loading states
function CardSkeleton() {
  return (
    <div className="relative w-full aspect-[1.586/1] rounded-3xl bg-gradient-to-br from-muted to-muted/50 animate-pulse overflow-hidden">
      <div className="absolute inset-0 p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="h-8 w-32 bg-muted-foreground/20 rounded-lg" />
          <div className="h-8 w-8 bg-muted-foreground/20 rounded-full" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-24 bg-muted-foreground/20 rounded" />
          <div className="h-6 w-48 bg-muted-foreground/20 rounded" />
        </div>
        <div className="flex justify-between items-end">
          <div className="h-4 w-20 bg-muted-foreground/20 rounded" />
          <div className="h-4 w-16 bg-muted-foreground/20 rounded" />
        </div>
      </div>
    </div>
  )
}

function QuickActionsSkeleton() {
  return (
    <div className="flex gap-3 justify-center">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted animate-pulse min-w-[80px]"
        >
          <div className="w-12 h-12 rounded-full bg-muted-foreground/20" />
          <div className="h-3 w-12 bg-muted-foreground/20 rounded" />
        </div>
      ))}
    </div>
  )
}

function SpendingTrackerSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-5 w-32 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="h-3 w-full bg-muted rounded-full mb-4" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 bg-muted rounded-full" />
        ))}
      </div>
    </div>
  )
}

function TransactionFeedSkeleton() {
  return (
    <div className="bg-card rounded-2xl p-5 border border-border animate-pulse">
      <div className="h-5 w-40 bg-muted rounded mb-4" />
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
            <div className="h-4 w-12 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Error state component with retry button
function ErrorState({
  message,
  onRetry,
  isRetrying,
}: {
  message: string
  onRetry: () => void
  isRetrying: boolean
}) {
  return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-5 text-center">
      <p className="text-destructive text-sm mb-3">{message}</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        disabled={isRetrying}
        className="border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        {isRetrying ? (
          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        Retry
      </Button>
    </div>
  )
}

// ============================================
// GOALS SCREEN
// ============================================
function GoalsScreen({ childId }: { childId: string }) {
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null)
  const [addAmount, setAddAmount] = useState(10)
  const [submitting, setSubmitting] = useState(false)
  const [showCreateGoal, setShowCreateGoal] = useState(false)
  const [newGoalEmoji, setNewGoalEmoji] = useState("🎯")
  const [newGoalName, setNewGoalName] = useState("")
  const [newGoalTarget, setNewGoalTarget] = useState(50)
  const [toast, setToast] = useState<string | null>(null)

  const GOAL_EMOJIS = ["🎯", "🎮", "📱", "🚲", "🎸", "⚽", "🧸", "👟"]

  const fetchGoalsData = useCallback(async () => {
    setLoading(true)
    try {
      const [profile, goalsData] = await Promise.all([
        getChildProfile(childId),
        getChildGoals(childId),
      ])
      setBalance(profile.balance)
      setGoals(goalsData)
    } catch {
      setToast("Could not load goals")
      setTimeout(() => setToast(null), 3000)
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    fetchGoalsData()
  }, [fetchGoalsData])

  const totalSaved = goals.reduce((acc, g) => acc + g.saved, 0)
  const totalTarget = goals.reduce((acc, g) => acc + g.target, 0)
  const overallProgress = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0

  const handleCreateGoal = async () => {
    if (submitting) return
    if (!newGoalName.trim()) {
      setToast("Enter a goal name")
      setTimeout(() => setToast(null), 3000)
      return
    }
    setSubmitting(true)
    try {
      await createChildGoal(childId, {
        emoji: newGoalEmoji,
        name: newGoalName.trim(),
        target: newGoalTarget,
      })
      await fetchGoalsData()
      setShowCreateGoal(false)
      setNewGoalName("")
      setNewGoalTarget(50)
      setNewGoalEmoji("🎯")
      setToast("Goal created!")
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not create goal")
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleAddCoins = async () => {
    if (!selectedGoal || submitting) return
    if (addAmount > balance) {
      setToast("Not enough PiggyCoins in your wallet")
      setTimeout(() => setToast(null), 3000)
      return
    }

    setSubmitting(true)
    try {
      const result = await contributeToGoal(childId, selectedGoal.id, addAmount)
      setBalance(result.newBalance)
      await fetchGoalsData()
      setSelectedGoal(null)
      setAddAmount(10)
      setToast(`Added ${addAmount} PC to ${selectedGoal.name}`)
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not add coins")
    } finally {
      setSubmitting(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (loading) {
    return (
      <main className="px-3 py-4 max-w-md mx-auto pb-4">
        <div className="animate-pulse bg-secondary rounded-2xl h-40 w-full mb-6" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-secondary rounded-2xl h-36" />
          ))}
        </div>
      </main>
    )
  }

  return (
    <main className="px-3 py-4 max-w-md mx-auto pb-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-xl px-4 py-3">
          <p className="font-medium text-sm">{toast}</p>
        </div>
      )}

      <div className="bg-card rounded-xl p-3 mb-4 border flex justify-between items-center">
        <span className="text-sm text-muted-foreground">Available to save</span>
        <span className="font-bold text-lg">{balance} 🪙</span>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white mb-6">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-white/80 text-sm">Total Saved</p>
            <p className="text-3xl font-bold">{totalSaved} PC</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Target</p>
            <p className="text-xl font-semibold">{totalTarget} PC</p>
          </div>
        </div>
        <Progress value={overallProgress} className="h-2 bg-white/20 [&>div]:bg-white" />
        <p className="text-white/80 text-xs mt-2">{overallProgress}% of all goals</p>
      </div>

      {goals.length === 0 && (
        <div className="text-center py-10 mb-4">
          <span className="text-6xl block mb-4">🎯</span>
          <h3 className="font-bold text-lg mb-2">No goals yet!</h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
            Create your first saving goal or complete a parent task to see it here.
          </p>
        </div>
      )}

      {goals.filter((g) => g.type === "parent_task").length > 0 && (
        <>
          <h3 className="font-semibold text-sm mb-3">Tasks from your parent 📋</h3>
          <div className="space-y-3 mb-6">
            {goals
              .filter((g) => g.type === "parent_task")
              .map((goal) => (
                <div key={goal.id} className="bg-card rounded-2xl p-4 border border-amber-500/30">
                  <Badge className="mb-2 bg-amber-500/20 text-amber-700 border-0">
                    Parent Task 📋
                  </Badge>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{goal.emoji}</span>
                    <div>
                      <p className="font-semibold">{goal.name}</p>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground">{goal.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3 mb-3 text-sm font-medium">
                    🏆 Reward: {goal.rewardPc ?? 0} PC + {goal.rewardXp ?? 0} XP
                  </div>
                  <Button
                    className="w-full rounded-xl"
                    onClick={async () => {
                      setSubmitting(true)
                      try {
                        const result = await completeParentTask(childId, goal.id)
                        setBalance(result.newBalance)
                        await fetchGoalsData()
                        setToast(`Task complete! +${result.rewardPc} PC`)
                      } catch (err) {
                        setToast(err instanceof Error ? err.message : "Could not complete task")
                      } finally {
                        setSubmitting(false)
                        setTimeout(() => setToast(null), 3000)
                      }
                    }}
                    disabled={submitting}
                  >
                    Mark as Done
                  </Button>
                </div>
              ))}
          </div>
        </>
      )}

      {goals.filter((g) => g.type !== "parent_task").length > 0 && (
        <h3 className="font-semibold text-sm mb-3">My Goals</h3>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {goals.filter((g) => g.type !== "parent_task").map((goal) => {
          const progress = goal.target > 0 ? Math.round((goal.saved / goal.target) * 100) : 0
          return (
            <div key={goal.id} className="bg-card rounded-2xl p-4 shadow-sm border">
              <div className="text-center mb-3">
                <span className="text-4xl">{goal.emoji}</span>
              </div>
              <p className="font-semibold text-sm text-center mb-2">{goal.name}</p>
              <Progress value={progress} className="h-2 mb-2" />
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">{goal.saved} / {goal.target} PC</span>
                <Badge className="bg-success/15 text-success-foreground border-0 text-xs">{progress}%</Badge>
              </div>
              <Button size="sm" variant="outline" className="w-full rounded-xl" onClick={() => setSelectedGoal(goal)}>
                + Add
              </Button>
            </div>
          )
        })}
      </div>

      {/* Create New Goal Button */}
      <Button
        type="button"
        className="w-full bg-gradient-to-r from-primary to-accent text-white h-12 rounded-2xl"
        onClick={() => setShowCreateGoal(true)}
      >
        Create New Goal
      </Button>

      {showCreateGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">New savings goal</h3>
              <button type="button" onClick={() => setShowCreateGoal(false)} className="text-muted-foreground hover:text-foreground text-2xl">x</button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">Pick an icon</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {GOAL_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewGoalEmoji(emoji)}
                  className={cn(
                    "w-12 h-12 rounded-xl text-2xl border-2 transition-all",
                    newGoalEmoji === emoji ? "border-primary bg-primary/10" : "border-border"
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">Goal name</label>
            <input
              type="text"
              value={newGoalName}
              onChange={(e) => setNewGoalName(e.target.value)}
              placeholder="e.g. New bike"
              className="w-full px-4 py-3 rounded-xl border bg-background mb-4"
              maxLength={80}
            />
            <label className="text-sm font-medium text-muted-foreground block mb-1">Target (PiggyCoins)</label>
            <input
              type="number"
              min={1}
              max={100000}
              value={newGoalTarget}
              onChange={(e) => setNewGoalTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-full px-4 py-3 rounded-xl border bg-background mb-6"
            />
            <Button
              type="button"
              onClick={handleCreateGoal}
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-accent text-white h-12 rounded-xl"
            >
              {submitting ? "Creating…" : "Create goal"}
            </Button>
          </div>
        </div>
      )}

      {/* Add Coins Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedGoal.emoji}</span>
                <div>
                  <h3 className="font-bold text-lg">{selectedGoal.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedGoal.saved} / {selectedGoal.target} PC</p>
                </div>
              </div>
              <button onClick={() => setSelectedGoal(null)} className="text-muted-foreground hover:text-foreground text-2xl">x</button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">Wallet balance: {balance} PC</p>
            <p className="text-sm text-muted-foreground mb-4">Quick add PiggyCoins (deducted from wallet):</p>
            <div className="flex gap-3 mb-6">
              {[5, 10, 20].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  disabled={amt > balance}
                  onClick={() => setAddAmount(amt)}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-semibold transition-all",
                    addAmount === amt ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
                    amt > balance && "opacity-40"
                  )}
                >
                  {amt} PC
                </button>
              ))}
            </div>
            <Button
              onClick={handleAddCoins}
              disabled={submitting || addAmount > balance}
              className="w-full bg-gradient-to-r from-primary to-accent text-white h-12 rounded-xl"
            >
              {submitting ? "Saving…" : `Confirm +${addAmount} PC`}
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

// ============================================
// SCORE SCREEN
// ============================================
function ScoreScreen() {
  const score = 73
  const radius = 80
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const factors = [
    { emoji: "🔥", name: "Saving streak", desc: "Days saving in a row", value: 80 },
    { emoji: "🏆", name: "Challenges", desc: "Weekly challenges done", value: 60 },
    { emoji: "💳", name: "Smart spending", desc: "Staying within limits", value: 70 },
    { emoji: "🎯", name: "Goals reached", desc: "Saving goals completed", value: 50 },
  ]

  const historyValues = [65, 68, 70, 67, 71, 72, 73]
  const historyPoints = historyValues.map((v, i) => `${i * 40},${100 - v}`).join(" ")

  return (
    <main className="px-3 py-4 max-w-md mx-auto pb-4">
      {/* Score Gauge */}
      <div className="flex flex-col items-center mb-6 relative">
        <svg width="200" height="200" className="transform -rotate-90">
          <circle cx="100" cy="100" r={radius} stroke="currentColor" strokeWidth="12" fill="none" className="text-muted" />
          <circle cx="100" cy="100" r={radius} stroke="currentColor" strokeWidth="12" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="text-emerald-500 transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl mb-2">🦁</span>
          <span className="text-4xl font-bold">{score}</span>
          <span className="text-sm text-muted-foreground">out of 100</span>
        </div>
      </div>

      {/* Tip Card */}
      <div className="bg-success/10 border border-success/30 rounded-2xl p-4 mb-6">
        <p className="text-success-foreground font-medium">Great job! Save a bit more to level up! 🚀</p>
      </div>

      {/* Factors */}
      <div className="mb-6">
        <h3 className="font-bold text-lg mb-4">What affects my score?</h3>
        <div className="space-y-4">
          {factors.map((factor, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-2xl">{factor.emoji}</span>
              <div className="flex-1">
                <div className="flex justify-between mb-1">
                  <span className="font-semibold text-sm">{factor.name}</span>
                  <span className="text-xs text-muted-foreground">{factor.value}%</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{factor.desc}</p>
                <Progress value={factor.value} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score History */}
      <Card className="p-4">
        <h3 className="font-bold text-sm mb-3">Score History (7 days)</h3>
        <svg width="100%" height="80" viewBox="0 0 240 100" className="text-primary">
          <polyline points={historyPoints} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {historyValues.map((v, i) => (
            <circle key={i} cx={i * 40} cy={100 - v} r="4" fill="currentColor" />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
        </div>
      </Card>
    </main>
  )
}

// ============================================
// CHALLENGES SCREEN
// ============================================
type ChallengeCard = {
  id: string
  emoji: string
  title: string
  desc: string
  difficulty: string
  xp: number
  progress: number
  tip: string
  instruction?: string
  isParentTask?: boolean
  goalId?: string
  rewardPc?: number
}

function xpDifficulty(xp: number): string {
  if (xp >= 300) return "Hard"
  if (xp >= 150) return "Medium"
  return "Easy"
}

function ChallengesScreen({ childId }: { childId: string }) {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeChallenges, setActiveChallenges] = useState<ChallengeCard[]>([])
  const [completedChallenges, setCompletedChallenges] = useState<ChallengeCard[]>([])
  const [submittingTask, setSubmittingTask] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const loadChallenges = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [challengeRes, goals] = await Promise.all([
        getChallenges(childId),
        getChildGoals(childId),
      ])

      const weeklyRaw = (challengeRes.challenges ?? []) as Array<{
        id: string
        title: string
        description: string
        icon: string | null
        xpReward: number
        progressPercent: number
        isCompleted: boolean
      }>

      const weekly: ChallengeCard[] = weeklyRaw.map((c) => ({
        id: c.id,
        emoji: c.icon ?? "🏆",
        title: c.title,
        desc: c.description,
        difficulty: xpDifficulty(c.xpReward),
        xp: c.xpReward,
        progress: c.progressPercent,
        tip: c.description,
      }))

      const parentTasks: ChallengeCard[] = goals
        .filter((g) => g.type === "parent_task" && g.status === "active")
        .map((g) => ({
          id: `parent-${g.id}`,
          goalId: g.id,
          emoji: g.emoji,
          title: g.name,
          desc: "Task from your parent",
          instruction: g.description?.trim() || g.name,
          difficulty: "Parent",
          xp: g.rewardXp ?? 0,
          progress: g.target > 0 ? Math.min(100, Math.round((g.saved / g.target) * 100)) : 0,
          tip: g.description?.trim() || g.name,
          isParentTask: true,
          rewardPc: g.rewardPc,
        }))

      const active = [
        ...parentTasks,
        ...weekly.filter((_, i) => !weeklyRaw[i]?.isCompleted),
      ]
      const completed = weekly.filter((_, i) => weeklyRaw[i]?.isCompleted)

      setActiveChallenges(active)
      setCompletedChallenges(completed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges")
    } finally {
      setLoading(false)
    }
  }, [childId])

  useEffect(() => {
    void loadChallenges()
  }, [loadChallenges])

  const list = activeTab === "active" ? activeChallenges : completedChallenges
  const selected = list.find((c) => c.id === selectedId) ?? activeChallenges.find((c) => c.id === selectedId)

  const totalXP = activeChallenges.reduce((sum, c) => sum + c.xp, 0)
  const earnedXP = completedChallenges.reduce((sum, c) => sum + c.xp, 0)
  const daysRemaining = Math.max(0, 7 - new Date().getDay())

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      case "Medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      case "Hard":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      case "Parent":
        return "bg-amber-500/20 text-amber-700 dark:text-amber-300"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const handleMarkParentTaskDone = async (goalId: string) => {
    setSubmittingTask(true)
    try {
      const result = await completeParentTask(childId, goalId)
      setToast(`Task complete! +${result.rewardPc} PC`)
      setSelectedId(null)
      await loadChallenges()
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not complete task")
    } finally {
      setSubmittingTask(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  if (loading) {
    return (
      <main className="px-3 py-4 max-w-md mx-auto pb-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl p-4 border animate-pulse h-24" />
        ))}
      </main>
    )
  }

  if (error) {
    return (
      <main className="px-3 py-4 max-w-md mx-auto pb-4">
        <ErrorState message={error} onRetry={() => void loadChallenges()} isRetrying={false} />
      </main>
    )
  }

  return (
    <main className="px-3 py-4 max-w-md mx-auto pb-4">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-card border shadow-lg rounded-xl px-4 py-3">
          <p className="font-medium text-sm">{toast}</p>
        </div>
      )}

      <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white mb-6">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-white/80 text-sm">XP Available</p>
            <p className="text-2xl font-bold">{totalXP} XP</p>
          </div>
          <div className="text-right">
            <p className="text-white/80 text-sm">Earned</p>
            <p className="text-xl font-semibold">{earnedXP} XP</p>
          </div>
        </div>
        <Progress
          value={totalXP > 0 ? (earnedXP / (totalXP + earnedXP)) * 100 : 0}
          className="h-2 bg-white/20 [&>div]:bg-white"
        />
        <p className="text-white/80 text-xs mt-2">{daysRemaining} days remaining this week</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("active")}
          className={cn(
            "flex-1 py-2 rounded-full font-semibold text-sm transition-all",
            activeTab === "active"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          Active ({activeChallenges.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={cn(
            "flex-1 py-2 rounded-full font-semibold text-sm transition-all",
            activeTab === "completed"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          Completed
        </button>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-10">
          <span className="text-5xl block mb-3">🏆</span>
          <p className="text-muted-foreground text-sm">
            {activeTab === "active"
              ? "No active challenges yet. Ask your parent to set a task!"
              : "Complete challenges to see them here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((challenge) => (
            <div
              key={challenge.id}
              onClick={() => setSelectedId(challenge.id)}
              className={cn(
                "bg-card rounded-2xl p-4 shadow-sm border cursor-pointer hover:shadow-md transition-shadow",
                challenge.isParentTask && "border-amber-500/40"
              )}
            >
              <div className="flex gap-4">
                <div className="rounded-2xl bg-secondary w-12 h-12 flex items-center justify-center text-2xl shrink-0">
                  {challenge.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h3 className="font-semibold text-sm">{challenge.title}</h3>
                    {challenge.isParentTask && (
                      <Badge className="shrink-0 bg-amber-500/20 text-amber-700 border-0 text-[10px]">
                        Parent
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {challenge.isParentTask
                      ? challenge.instruction ?? challenge.tip
                      : challenge.desc}
                  </p>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full font-medium",
                        getDifficultyColor(challenge.difficulty)
                      )}
                    >
                      {challenge.difficulty}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                      {challenge.isParentTask
                        ? `${challenge.rewardPc ?? 0} PC + ${challenge.xp} XP`
                        : `${challenge.xp} XP`}
                    </span>
                  </div>
                  {!challenge.isParentTask && (
                    <>
                      <Progress value={challenge.progress} className="h-1.5" />
                      <p className="text-xs text-muted-foreground mt-1">{challenge.progress}% complete</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-secondary w-14 h-14 flex items-center justify-center text-3xl">
                  {selected.emoji}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{selected.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selected.isParentTask ? "Task from your parent" : selected.desc}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-muted-foreground hover:text-foreground text-2xl"
              >
                ×
              </button>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
              <span
                className={cn(
                  "text-xs px-2 py-1 rounded-full font-medium",
                  getDifficultyColor(selected.difficulty)
                )}
              >
                {selected.difficulty}
              </span>
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {selected.isParentTask
                  ? `${selected.rewardPc ?? 0} PC + ${selected.xp} XP`
                  : `${selected.xp} XP Reward`}
              </span>
            </div>
            {!selected.isParentTask && (
              <>
                <Progress value={selected.progress} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground mb-4">{selected.progress}% complete</p>
              </>
            )}
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4">
              <p className="font-semibold text-sm mb-1">
                {selected.isParentTask ? "What to do" : "How to complete this"}
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {selected.isParentTask
                  ? selected.instruction ?? selected.tip
                  : selected.tip}
              </p>
              {selected.isParentTask && (
                <p className="text-xs text-muted-foreground mt-3">
                  Reward when done: {selected.rewardPc ?? 0} PC + {selected.xp} XP
                </p>
              )}
            </div>
            {selected.isParentTask && selected.goalId ? (
              <Button
                className="w-full h-12 rounded-xl mb-2"
                disabled={submittingTask}
                onClick={() => void handleMarkParentTaskDone(selected.goalId!)}
              >
                {submittingTask ? "Saving…" : "Mark as Done"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setSelectedId(null)} className="w-full h-12 rounded-xl">
              Got it!
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <main className="px-3 py-4 max-w-md mx-auto pb-4">
      <Card className="border-dashed border-2 bg-card/50">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <span className="text-3xl">🚀</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
          <p className="text-muted-foreground">Coming soon</p>
          <p className="text-sm text-muted-foreground mt-2">
            {"We're working hard to bring you this feature!"}
          </p>
          {title === "Investment Academy" && (
            <a 
              href="/invest" 
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              View Investment Services Demo
            </a>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

// ============================================
// LEARN SCREEN (Investment Academy)
// ============================================
interface LearnScreenProps {
  onInvestmentChange?: (amount: number) => void
}

function LearnScreen({ onInvestmentChange, childId }: LearnScreenProps & { childId: string }) {
  const [innerTab, setInnerTab] = useState<"learn" | "market" | "portfolio">("learn")
  const [learnProfileLoading, setLearnProfileLoading] = useState(true)
  const [learnProfileError, setLearnProfileError] = useState<string | null>(null)
  const [childBalance, setChildBalance] = useState(0)
  const [totalInvested, setTotalInvested] = useState(0)
  const [portfolio, setPortfolio] = useState<{ companyId: string; shares: number; avgPrice: number }[]>([])
  const [companies, setCompanies] = useState<MarketCompanyDisplay[]>([])
  const [tradeLoading, setTradeLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<number | null>(null)
  const [quizMode, setQuizMode] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [quizAnswers, setQuizAnswers] = useState<number[]>([])
  const [showResult, setShowResult] = useState(false)
  const [lessonStars, setLessonStars] = useState<number[]>(emptyLessonStars())
  const [lessonRewardPc, setLessonRewardPc] = useState(0)
  const [showReward, setShowReward] = useState(false)
  const [celebration, setCelebration] = useState<{
    emoji: string
    stars: number
    xp: number
    rewardPc: number
  } | null>(null)
  const [buyModal, setBuyModal] = useState<{ companyId: string; shares: number } | null>(null)
  const [sellModal, setSellModal] = useState<{ companyId: string; shares: number } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [expandedNews, setExpandedNews] = useState<string | null>(null)

  const fetchLearnData = useCallback(async () => {
    setLearnProfileLoading(true)
    setLearnProfileError(null)
    try {
      const [profile, portfolioData, market, lessonData] = await Promise.all([
        getChildProfile(childId),
        getChildPortfolio(childId),
        getMarketPrices(),
        getLessonProgress(childId).catch(() => ({
          stars: emptyLessonStars(),
          investmentXp: 0,
          lessonCount: LESSONS.length,
        })),
      ])

      setLessonStars(lessonData.stars)
      setChildBalance(profile.balance)
      setPortfolio(portfolioData.holdings)
      setTotalInvested(portfolioData.totalInvested)

      const newsByCompany = new Map<string, string>()
      for (const item of market.recentNews ?? []) {
        if (!newsByCompany.has(item.companyId)) {
          newsByCompany.set(item.companyId, item.headline)
        }
      }

      const prices = market.prices ?? []
      setCompanies(
        prices.map((c: { id: string; name: string; icon: string | null; currentPrice: number; change24h: number; history7d: Array<{ price: number }> }, i: number) => {
          const history = (c.history7d ?? []).map((h) => h.price)
          return {
            id: c.id,
            name: c.name,
            emoji: c.icon ?? "📈",
            price: c.currentPrice,
            change: c.change24h,
            history: history.length >= 2 ? history : [c.currentPrice, c.currentPrice],
            news: buildInvestmentWhy(
              c.name,
              c.change24h,
              newsByCompany.get(c.id)
            ),
            gradient: COMPANY_GRADIENTS[i % COMPANY_GRADIENTS.length],
          }
        })
      )
    } catch (err) {
      setLearnProfileError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLearnProfileLoading(false)
    }
  }, [childId])

  useEffect(() => {
    fetchLearnData()
  }, [fetchLearnData])

  const lessons = LESSONS

  const perfectBatches = Math.floor(LESSONS.length / LESSON_BATCH_SIZE)
  const completedBatches = Array.from({ length: perfectBatches }, (_, batch) => {
    const start = batch * LESSON_BATCH_SIZE
    const end = start + LESSON_BATCH_SIZE
    for (let i = start; i < end; i++) {
      if ((lessonStars[i] ?? 0) < 3) return false
    }
    return true
  }).filter(Boolean).length

  const investmentXP = investmentXpFromStars(lessonStars)
  const level = Math.max(1, completedBatches + 1)
  const lessonsCompleted = lessonStars.filter((s) => s > 0).length

  const handleBuy = async () => {
    if (!buyModal || tradeLoading) return
    const company = companies.find((c) => c.id === buyModal.companyId)
    if (!company) return
    const totalCost = company.price * buyModal.shares
    if (totalCost > childBalance) return

    setTradeLoading(true)
    try {
      const buyResult = await buyShares(childId, buyModal.companyId, buyModal.shares)
      if (typeof buyResult.newBalance === "number") {
        setChildBalance(buyResult.newBalance)
      }
      try {
        const portfolioData = await getChildPortfolio(childId)
        setChildBalance(portfolioData.balance)
        setPortfolio(portfolioData.holdings)
        setTotalInvested(portfolioData.totalInvested)
        onInvestmentChange?.(portfolioData.totalInvested)
      } catch {
        await fetchLearnData()
      }
      setToast(`🎉 You bought ${buyModal.shares} shares of ${company.name}!`)
      setBuyModal(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not buy shares")
    } finally {
      setTradeLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleSell = async () => {
    if (!sellModal || tradeLoading) return
    const company = companies.find((c) => c.id === sellModal.companyId)
    const holding = portfolio.find((p) => p.companyId === sellModal.companyId)
    if (!company || !holding || sellModal.shares > holding.shares) return

    setTradeLoading(true)
    try {
      const sellResult = await sellShares(childId, sellModal.companyId, sellModal.shares)
      if (typeof sellResult.newBalance === "number") {
        setChildBalance(sellResult.newBalance)
      }
      try {
        const portfolioData = await getChildPortfolio(childId)
        setChildBalance(portfolioData.balance)
        setPortfolio(portfolioData.holdings)
        setTotalInvested(portfolioData.totalInvested)
        onInvestmentChange?.(portfolioData.totalInvested)
      } catch {
        await fetchLearnData()
      }
      setToast(`💰 You sold ${sellModal.shares} shares of ${company.name}!`)
      setSellModal(null)
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Could not sell shares")
    } finally {
      setTradeLoading(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleQuizAnswer = (answerIndex: number) => {
    const lesson = lessons[selectedLesson!]
    if (!lesson.quiz) return
    const newAnswers = [...quizAnswers, answerIndex]
    setQuizAnswers(newAnswers)
    if (newAnswers.length >= lesson.quiz.length) setTimeout(() => setShowResult(true), 500)
    else setTimeout(() => setCurrentQuestion((prev) => prev + 1), 500)
  }

  const calculateStars = () => {
    const lesson = lessons[selectedLesson!]
    if (!lesson.quiz) return 0
    const correct = quizAnswers.filter((a, i) => a === lesson.quiz![i].correct).length
    return correct === 3 ? 3 : correct === 2 ? 2 : correct >= 1 ? 1 : 0
  }

  const handleClaimReward = async () => {
    if (selectedLesson === null) return
    const stars = calculateStars()
    try {
      const result = await saveLessonProgress(childId, selectedLesson, stars)
      setLessonStars(result.stars)
      setLessonRewardPc(result.rewardPc)
      if (result.newBalance != null) setChildBalance(result.newBalance)
      recordLessonCompletedToday()
      setCelebration({
        emoji: lessons[selectedLesson].emoji,
        stars,
        xp: lessons[selectedLesson].xp,
        rewardPc: result.rewardPc,
      })
      setTimeout(() => setCelebration(null), 2000)
    } catch {
      setLessonStars((prev) => {
        const next = [...prev]
        next[selectedLesson] = Math.max(next[selectedLesson] ?? 0, stars)
        return next
      })
      setLessonRewardPc(stars === 3 ? lessons[selectedLesson].xp : 0)
    }
    setShowResult(false)
    setQuizMode(false)
    setShowReward(true)
  }

  const portfolioValue = portfolio.reduce((acc, p) => { const company = companies.find((c) => c.id === p.companyId); return acc + (company?.price || 0) * p.shares }, 0)
  const portfolioProfitLoss = portfolioValue - totalInvested
  const uniqueCompanies = portfolio.length

  return (
    <main className="px-3 py-4 max-w-md mx-auto pb-4">
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-card border shadow-lg rounded-xl px-4 py-3 animate-in slide-in-from-top"><p className="font-medium text-sm">{toast}</p></div>}

      <div className="flex gap-2 mb-6">
        {(["learn", "market", "portfolio"] as const).map((tab) => (
          <button key={tab} onClick={() => setInnerTab(tab)} className={cn("flex-1 py-2 rounded-full font-semibold text-sm capitalize transition-all", innerTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>{tab}</button>
        ))}
      </div>

      {innerTab === "learn" && (
        <LearnTabPath
          lessons={lessons}
          lessonStars={lessonStars}
          investmentXp={investmentXP}
          onSelectLesson={(i) => setSelectedLesson(i)}
        />
      )}

      {innerTab === "market" && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4"><p className="text-sm text-blue-700">Prices update every 6 hours. Invested coins are held safely and earn dividends from your parent!</p></div>
          {learnProfileLoading ? (
            <div className="animate-pulse bg-secondary rounded-2xl h-24 w-full" />
          ) : learnProfileError ? (
            <ErrorState
              message={learnProfileError}
              onRetry={fetchLearnData}
              isRetrying={learnProfileLoading}
            />
          ) : (
            <div className="bg-card rounded-xl p-3 mb-4 border flex justify-between items-center"><span className="text-sm text-muted-foreground">Your Balance</span><span className="font-bold text-lg">{childBalance} 🪙</span></div>
          )}
          <div className="space-y-4">
            {companies.map((company) => {
              const holding = portfolio.find((p) => p.companyId === company.id)
              const minY = Math.min(...company.history); const maxY = Math.max(...company.history); const range = maxY - minY || 1
              const points = company.history.map((v, i) => `${i * 30},${40 - ((v - minY) / range) * 35}`).join(" ")
              return (
                <div key={company.id} className="bg-card rounded-2xl p-4 shadow-sm border">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br", company.gradient)}>{company.emoji}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{company.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold">{company.price} PC</span>
                        <span className={cn("text-sm font-medium flex items-center gap-1", company.change >= 0 ? "text-emerald-600" : "text-red-500")}>{company.change >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}{company.change >= 0 ? "+" : ""}{company.change}%</span>
                      </div>
                    </div>
                    <svg width="80" height="40" className={company.change >= 0 ? "text-emerald-500" : "text-red-400"}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </div>
                  <button onClick={() => setExpandedNews(expandedNews === company.id ? null : company.id)} className="text-xs text-primary font-medium mb-3">{expandedNews === company.id ? "Hide why" : "Why?"}</button>
                  {expandedNews === company.id && <p className="text-sm text-muted-foreground mb-3 bg-secondary/50 rounded-lg p-2">{company.news}</p>}
                  <div className="flex gap-2">
                    <Button onClick={() => setBuyModal({ companyId: company.id, shares: 1 })} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl" size="sm">Buy</Button>
                    <Button onClick={() => holding && setSellModal({ companyId: company.id, shares: 1 })} disabled={!holding} variant="outline" className="flex-1 rounded-xl" size="sm">Sell {holding ? `(${holding.shares})` : ""}</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {innerTab === "portfolio" && (
        <>
          {portfolio.length === 0 ? (
            <div className="text-center py-16"><span className="text-6xl mb-4 block">🚀</span><h3 className="font-bold text-lg mb-2">No investments yet</h3><p className="text-muted-foreground text-sm">Go to Market tab to buy your first share</p></div>
          ) : (
            <>
              <div className="bg-gradient-to-r from-primary to-accent rounded-2xl p-4 text-white mb-6">
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div><p className="text-white/80 text-sm">Portfolio Value</p><p className="text-2xl font-bold">{portfolioValue.toFixed(0)} PC</p></div>
                  <div><p className="text-white/80 text-sm">Total Invested (locked)</p><p className="text-xl font-semibold">{totalInvested.toFixed(0)} PC</p></div>
                </div>
                <div className={cn("text-lg font-bold", portfolioProfitLoss >= 0 ? "text-emerald-300" : "text-red-300")}>{portfolioProfitLoss >= 0 ? "+" : ""}{portfolioProfitLoss.toFixed(0)} PC profit/loss</div>
              </div>
              <h3 className="font-bold mb-3">Your Holdings</h3>
              <div className="space-y-3 mb-6">
                {portfolio.map((holding) => {
                  const company = companies.find((c) => c.id === holding.companyId)
                  if (!company) return null
                  const currentValue = company.price * holding.shares; const costBasis = holding.avgPrice * holding.shares; const profitLoss = currentValue - costBasis
                  return (
                    <div key={holding.companyId} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                      <span className="text-2xl">{company.emoji}</span>
                      <div className="flex-1"><p className="font-semibold text-sm">{company.name}</p><p className="text-xs text-muted-foreground">{holding.shares} shares @ {holding.avgPrice.toFixed(0)} PC avg</p></div>
                      <div className="text-right"><p className="font-semibold">{currentValue.toFixed(0)} PC</p><p className={cn("text-xs font-medium", profitLoss >= 0 ? "text-emerald-600" : "text-red-500")}>{profitLoss >= 0 ? "+" : ""}{profitLoss.toFixed(0)} PC</p></div>
                    </div>
                  )
                })}
              </div>
              <Card className="p-4"><h3 className="font-bold text-sm mb-2">Portfolio Health</h3><div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center"><span className="font-bold text-primary">{Math.min(uniqueCompanies * 3, 10)}/10</span></div><p className="text-sm text-muted-foreground flex-1">{uniqueCompanies < 3 ? "Try buying more companies to diversify 🧺" : "Great mix of companies! 🎉"}</p></div></Card>
            </>
          )}
        </>
      )}

      {selectedLesson !== null && !quizMode && !showResult && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3"><span className="text-4xl">{lessons[selectedLesson].emoji}</span><h3 className="font-bold text-xl">{lessons[selectedLesson].title}</h3></div>
              <button onClick={() => setSelectedLesson(null)} className="text-muted-foreground hover:text-foreground text-2xl">x</button>
            </div>
            <div className="bg-warning/10 border border-warning/30 rounded-2xl p-4 mb-4"><p className="text-sm font-medium">💡 Fun Fact</p><p className="text-sm text-muted-foreground">{lessons[selectedLesson].funFact}</p></div>
            <div className="space-y-4 mb-6">{lessons[selectedLesson].content?.map((para, i) => (<p key={i} className="text-sm leading-relaxed">{para}</p>))}</div>
            <Button onClick={() => { setQuizMode(true); setCurrentQuestion(0); setQuizAnswers([]) }} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white">Take the Quiz →</Button>
          </div>
        </div>
      )}

      {selectedLesson !== null && quizMode && !showResult && lessons[selectedLesson].quiz && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-center mb-6"><p className="text-sm text-muted-foreground">Question {currentQuestion + 1} of 3</p><button onClick={() => { setQuizMode(false); setSelectedLesson(null) }} className="text-muted-foreground hover:text-foreground text-2xl">x</button></div>
            <h3 className="font-bold text-lg mb-6">{lessons[selectedLesson].quiz[currentQuestion].q}</h3>
            <div className="space-y-3">
              {lessons[selectedLesson].quiz[currentQuestion].opts.map((opt, i) => {
                const answered = quizAnswers.length > currentQuestion; const isCorrect = i === lessons[selectedLesson].quiz![currentQuestion].correct; const wasSelected = quizAnswers[currentQuestion] === i
                return <button key={i} onClick={() => !answered && handleQuizAnswer(i)} disabled={answered} className={cn("w-full p-4 rounded-xl text-left transition-all font-medium", answered ? isCorrect ? "bg-emerald-100 border-2 border-emerald-500 text-emerald-700" : wasSelected ? "bg-red-100 border-2 border-red-500 text-red-700" : "bg-secondary opacity-50" : "bg-secondary hover:bg-secondary/80")}>{opt}</button>
              })}
            </div>
            {quizAnswers.length > currentQuestion && <p className="mt-4 text-sm text-muted-foreground">{lessons[selectedLesson].quiz![currentQuestion].exp}</p>}
          </div>
        </div>
      )}

      {selectedLesson !== null && showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-3xl w-full max-w-sm mx-4 p-6 text-center animate-in zoom-in-95 duration-300">
            <span className="text-6xl block mb-4">🎉</span><h3 className="font-bold text-xl mb-2">Quiz Complete!</h3>
            <div className="flex justify-center gap-1 mb-4">{[1, 2, 3].map((star) => (<Star key={star} className={cn("w-8 h-8", star <= calculateStars() ? "text-yellow-400 fill-yellow-400" : "text-gray-300")} />))}</div>
            <p className="text-muted-foreground mb-6">You earned {calculateStars()} star{calculateStars() !== 1 ? "s" : ""}!</p>
            <Button onClick={handleClaimReward} className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white">Claim Reward</Button>
          </div>
        </div>
      )}

      {celebration && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60">
          <div className="bg-card rounded-3xl p-8 text-center max-w-sm mx-4 animate-in zoom-in-95">
            <span className="text-7xl block mb-4 animate-bounce">{celebration.emoji}</span>
            <h3 className="font-bold text-2xl mb-2">Lesson Complete! 🎉</h3>
            <p className="text-lg mb-1">{celebration.stars} stars earned</p>
            <p className="text-primary font-bold text-xl">+{celebration.xp} XP</p>
            {celebration.rewardPc > 0 && (
              <p className="text-emerald-600 font-semibold mt-2">+{celebration.rewardPc} PC</p>
            )}
          </div>
        </div>
      )}

      {showReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50">
          <div className="bg-card rounded-3xl w-full max-w-sm mx-4 p-6 text-center animate-in zoom-in-95 duration-300 relative overflow-hidden">
            <style>{`@keyframes float { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(-100px) rotate(360deg); opacity: 0; } } .confetti { position: absolute; width: 10px; height: 10px; border-radius: 2px; animation: float 1.5s ease-out forwards; }`}</style>
            {[...Array(8)].map((_, i) => (<div key={i} className="confetti" style={{ left: `${10 + i * 12}%`, top: "60%", backgroundColor: ["#ff6b6b", "#4ecdc4", "#ffe66d", "#95e1d3", "#f38181", "#aa96da", "#fcbad3", "#a8d8ea"][i], animationDelay: `${i * 0.1}s` }} />))}
            <span className="text-6xl block mb-4">🎉</span>
            <h3 className="font-bold text-xl mb-2">
              {lessonRewardPc > 0 ? `You earned ${lessonRewardPc} PiggyCoins!` : "Lesson saved!"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {lessonRewardPc > 0 ? "Perfect quiz — coins added to your balance." : "Keep going for 3 stars to earn PiggyCoins."}
            </p>
            <Button onClick={() => { setShowReward(false); setSelectedLesson(null) }} className="w-full h-12 rounded-xl">Awesome!</Button>
          </div>
        </div>
      )}

      {buyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            {(() => { const company = companies.find((c) => c.id === buyModal.companyId); if (!company) return null; const totalCost = company.price * buyModal.shares; return (
              <><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><span className="text-4xl">{company.emoji}</span><div><h3 className="font-bold text-lg">{company.name}</h3><p className="text-sm text-muted-foreground">{company.price} PC per share</p></div></div><button onClick={() => setBuyModal(null)} className="text-muted-foreground hover:text-foreground text-2xl">x</button></div>
              <p className="text-sm text-muted-foreground mb-3">How many shares?</p>
              <div className="flex gap-3 mb-4">{[1, 5, 10].map((amt) => (<button key={amt} onClick={() => setBuyModal({ ...buyModal, shares: amt })} className={cn("flex-1 py-3 rounded-xl font-semibold transition-all", buyModal.shares === amt ? "bg-emerald-500 text-white" : "bg-secondary text-secondary-foreground")}>{amt}</button>))}</div>
              <div className="bg-secondary rounded-xl p-3 mb-4 flex justify-between items-center"><span className="text-muted-foreground">Total cost:</span><span className="font-bold text-lg">{totalCost} 🪙</span></div>
              {totalCost > childBalance && <p className="text-red-500 text-sm mb-4">Not enough PiggyCoins!</p>}
              <Button onClick={handleBuy} disabled={totalCost > childBalance || tradeLoading} className="w-full h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white">{tradeLoading ? "Processing…" : "Confirm Buy"}</Button></>
            )})()}
          </div>
        </div>
      )}

      {sellModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50">
          <div className="bg-card rounded-t-3xl w-full max-w-md p-6 animate-in slide-in-from-bottom duration-300">
            {(() => { const company = companies.find((c) => c.id === sellModal.companyId); const holding = portfolio.find((p) => p.companyId === sellModal.companyId); if (!company || !holding) return null; const totalValue = company.price * sellModal.shares; return (
              <><div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><span className="text-4xl">{company.emoji}</span><div><h3 className="font-bold text-lg">{company.name}</h3><p className="text-sm text-muted-foreground">You own {holding.shares} shares</p></div></div><button onClick={() => setSellModal(null)} className="text-muted-foreground hover:text-foreground text-2xl">x</button></div>
              <p className="text-sm text-muted-foreground mb-3">How many to sell?</p>
              <div className="flex gap-3 mb-4">{[1, Math.min(5, holding.shares), holding.shares].filter((v, i, a) => a.indexOf(v) === i).map((amt) => (<button key={amt} onClick={() => setSellModal({ ...sellModal, shares: amt })} className={cn("flex-1 py-3 rounded-xl font-semibold transition-all", sellModal.shares === amt ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>{amt === holding.shares ? "All" : amt}</button>))}</div>
              <div className="bg-secondary rounded-xl p-3 mb-4 flex justify-between items-center"><span className="text-muted-foreground">You will receive:</span><span className="font-bold text-lg">{totalValue} 🪙</span></div>
              <Button onClick={handleSell} disabled={tradeLoading} className="w-full h-12 rounded-xl">{tradeLoading ? "Processing…" : "Confirm Sell"}</Button></>
            )})()}
          </div>
        </div>
      )}
    </main>
  )
}

function CardScreen({ childId }: { childId: string }) {
  // Profile state
  const [profile, setProfile] = useState<ChildProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)

  // Spending state
  const [spending, setSpending] = useState<SpendingData | null>(null)
  const [spendingLoading, setSpendingLoading] = useState(true)
  const [spendingError, setSpendingError] = useState<string | null>(null)

  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [transactionsLoading, setTransactionsLoading] = useState(true)
  const [transactionsError, setTransactionsError] = useState<string | null>(null)

  // UI state
  const [isFrozen, setIsFrozen] = useState(false)
  const [freezeMessage, setFreezeMessage] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [cardColorId, setCardColorId] = useState("pink-purple")
  const [showPinRequest, setShowPinRequest] = useState(false)
  const [showPinSuccess, setShowPinSuccess] = useState(false)
  const [revealedPin, setRevealedPin] = useState<string | null>(null)
  const [pinCode, setPinCode] = useState(["", "", "", ""])
  const [pinError, setPinError] = useState<string | null>(null)
  const [pinVerifying, setPinVerifying] = useState(false)
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean
    merchant: string
    categoryIcon: string
    amount: number
    simulateResult: "approved" | "blocked"
    blockedReason?: string
  }>({
    isOpen: false,
    merchant: "",
    categoryIcon: "",
    amount: 0,
    simulateResult: "approved",
  })

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    setProfileLoading(true)
    setProfileError(null)
    try {
      const data = await getChildProfile(childId)
      setProfile(data)
      setIsFrozen(data.isFrozen)
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to load profile")
    } finally {
      setProfileLoading(false)
    }
  }, [childId])

  // Fetch spending data
  const fetchSpending = useCallback(async () => {
    setSpendingLoading(true)
    setSpendingError(null)
    try {
      const data = await getSpendingToday(childId)
      setSpending(data)
    } catch (err) {
      setSpendingError(err instanceof Error ? err.message : "Failed to load spending data")
    } finally {
      setSpendingLoading(false)
    }
  }, [childId])

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true)
    setTransactionsError(null)
    try {
      const data = await getWalletTransactions(childId, 10)
      setTransactions(data)
    } catch (err) {
      setTransactionsError(err instanceof Error ? err.message : "Failed to load transactions")
    } finally {
      setTransactionsLoading(false)
    }
  }, [childId])

  // Initial data fetch
  useEffect(() => {
    applyChildTheme()
    setCardColorId(loadStoredCardColor())
    fetchProfile()
    fetchSpending()
    fetchTransactions()
  }, [fetchProfile, fetchSpending, fetchTransactions])

  const handleFreezeToggle = async () => {
    if (isFrozen) {
      setFreezeMessage("Only your parent can unfreeze your card. Ask them in the parent app.")
      setTimeout(() => setFreezeMessage(null), 4000)
      return
    }
    setIsFrozen(true)
    try {
      await setCardFrozen(childId, true)
    } catch {
      setIsFrozen(false)
      setFreezeMessage("Could not freeze card. Try again.")
      setTimeout(() => setFreezeMessage(null), 4000)
    }
  }

  const handleViewPin = () => {
    setPinCode(["", "", "", ""])
    setPinError(null)
    setShowPinRequest(true)
    void requestPinReveal(childId).catch(() => {
      // Parent may still generate a code manually
    })
  }

  const handleVerifyPin = async () => {
    const code = pinCode.join("")
    if (code.length !== 4) return
    setPinVerifying(true)
    setPinError(null)
    try {
      const res = await fetch(`/api/children/${childId}/pin-reveal/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!data.valid) {
        setPinError(data.error ?? "Invalid or expired code")
        return
      }
      setRevealedPin(data.pin)
      setShowPinRequest(false)
      setShowPinSuccess(true)
    } catch {
      setPinError("Could not verify code")
    } finally {
      setPinVerifying(false)
    }
  }

  const handleSettings = () => {
    setShowSettings(true)
  }

  const simulateApprovedPayment = () => {
    setPaymentModal({
      isOpen: true,
      merchant: "Pizza Place",
      categoryIcon: "🍕",
      amount: 8,
      simulateResult: "approved",
    })
  }

  const simulateBlockedPayment = () => {
    setPaymentModal({
      isOpen: true,
      merchant: "Game Store",
      categoryIcon: "🎮",
      amount: 15,
      simulateResult: "blocked",
      blockedReason: "Gaming purchases are turned off. Ask your parent to enable it.",
    })
  }

  return (
    <>
      {/* Main Content */}
      <main className="px-3 py-4 max-w-md mx-auto space-y-4 pb-4">
        {/* Virtual Card */}
        {profileLoading ? (
          <CardSkeleton />
        ) : profileError ? (
          <ErrorState
            message={profileError}
            onRetry={fetchProfile}
            isRetrying={profileLoading}
          />
        ) : profile ? (
          <>
            <VirtualCard
              childName={profile.name}
              cardNumber={profile.cardNumber}
              balance={profile.balance}
              isFrozen={isFrozen}
              cardGradientId={cardColorId}
            />
            {(profile.lockedInvestmentPc ?? 0) > 0 && (
              <div className="flex justify-center mt-2">
                <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                  🔒 {profile.lockedInvestmentPc} PC locked in investments
                </span>
              </div>
            )}
          </>
        ) : null}

        {/* Quick Actions */}
        {profileLoading ? (
          <QuickActionsSkeleton />
        ) : profile ? (
          <>
            {freezeMessage && (
              <p className="text-sm text-center text-muted-foreground bg-secondary/80 rounded-xl px-3 py-2">
                {freezeMessage}
              </p>
            )}
            <QuickActions
              isFrozen={isFrozen}
              onFreezeToggle={handleFreezeToggle}
              onViewPin={handleViewPin}
              onSettings={handleSettings}
            />
          </>
        ) : null}

        {/* Demo Buttons for Payment Modal */}
        <div className="bg-card rounded-2xl p-4 border border-border">
          <p className="text-sm text-muted-foreground mb-3 text-center">Demo: Simulate a payment</p>
          <div className="flex gap-3">
            <Button
              onClick={simulateApprovedPayment}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-5"
            >
              Approved Payment
            </Button>
            <Button
              onClick={simulateBlockedPayment}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-xl py-5"
            >
              Blocked Payment
            </Button>
          </div>
        </div>

        {/* Spending Tracker */}
        {spendingLoading ? (
          <SpendingTrackerSkeleton />
        ) : spendingError ? (
          <ErrorState
            message={spendingError}
            onRetry={fetchSpending}
            isRetrying={spendingLoading}
          />
        ) : spending ? (
          <SpendingTracker
            used={spending.used}
            limit={spending.limit}
            categories={spending.categories}
          />
        ) : null}

        {/* Transaction Feed */}
        {transactionsLoading ? (
          <TransactionFeedSkeleton />
        ) : transactionsError ? (
          <ErrorState
            message={transactionsError}
            onRetry={fetchTransactions}
            isRetrying={transactionsLoading}
          />
        ) : (
          <TransactionFeed transactions={transactions} />
        )}
      </main>

      {/* Fixed Card Status at Bottom */}
      <div className="fixed bottom-20 left-0 right-0 bg-background/80 backdrop-blur-lg border-t border-border p-4 z-30">
        <div className="max-w-md mx-auto">
          <CardStatusIndicator isActive={!isFrozen} />
        </div>
      </div>

      <ChildSettingsSheet
        open={showSettings}
        onClose={() => setShowSettings(false)}
        cardColorId={cardColorId}
        onCardColorChange={setCardColorId}
      />

      <PinRevealSheets
        showRequest={showPinRequest}
        showSuccess={showPinSuccess}
        pin={revealedPin}
        error={pinError}
        verifying={pinVerifying}
        code={pinCode}
        onCodeChange={setPinCode}
        onCloseRequest={() => setShowPinRequest(false)}
        onCloseSuccess={() => {
          setShowPinSuccess(false)
          setRevealedPin(null)
        }}
        onVerify={handleVerifyPin}
      />

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal((prev) => ({ ...prev, isOpen: false }))}
        merchant={paymentModal.merchant}
        categoryIcon={paymentModal.categoryIcon}
        amount={paymentModal.amount}
        simulateResult={paymentModal.simulateResult}
        blockedReason={paymentModal.blockedReason}
      />
    </>
  )
}

export default function PiggyBankWorld() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>("card")
  const [childInvestments, setChildInvestments] = useState(0)
  const [authChecked, setAuthChecked] = useState(false)
  const [childId, setChildId] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<ChildNotification[]>([])
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false)
  const [deletingAllNotifications, setDeletingAllNotifications] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    if (!childId) return
    const data = await getChildNotifications(childId)
    setNotifications(data)
  }, [childId])

  const markAllNotificationsRead = useCallback(async () => {
    if (!childId) return
    setMarkingNotificationsRead(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      await markChildNotificationsRead(childId)
    } catch {
      await fetchNotifications()
    } finally {
      setMarkingNotificationsRead(false)
    }
  }, [childId, fetchNotifications])

  const deleteNotification = useCallback(
    async (id: number) => {
      if (!childId) return
      await fetch(`/api/children/${childId}/notifications/${id}`, { method: "DELETE" })
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      setToast("Notification deleted")
      setTimeout(() => setToast(null), 2000)
    },
    [childId]
  )

  const deleteAllNotifications = useCallback(async () => {
    if (!childId) return
    setDeletingAllNotifications(true)
    try {
      const res = await fetch(`/api/children/${childId}/notifications`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setNotifications([])
      setToast("All notifications cleared")
      setTimeout(() => setToast(null), 2000)
    } catch {
      await fetchNotifications()
    } finally {
      setDeletingAllNotifications(false)
    }
  }, [childId, fetchNotifications])

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth/child")
  }, [router])

  useEffect(() => {
    applyChildTheme()
  }, [])

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.replace("/auth/child")
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        if (data.userType !== "child") {
          router.replace("/auth/child")
          return
        }
        setChildId(data.userId)
        setAuthChecked(true)
      })
      .catch(() => router.replace("/auth/child"))
  }, [router])

  useEffect(() => {
    if (authChecked && childId) fetchNotifications()
  }, [authChecked, childId, fetchNotifications])

  useEffect(() => {
    if (!authChecked || !childId) return
    const refresh = () => fetchNotifications()
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [authChecked, childId, fetchNotifications])

  useEffect(() => {
    if (!showNotifications) return
    const onDocClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [showNotifications])

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0]

  const handleInvestmentChange = (amount: number) => {
    setChildInvestments(amount)
  }

  if (!authChecked || !childId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse bg-secondary rounded-2xl h-24 w-full max-w-sm mx-4" />
      </div>
    )
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background">
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[70] bg-card border shadow-lg rounded-xl px-4 py-3">
          <p className="font-medium text-sm">{toast}</p>
        </div>
      )}
      {/* Header */}
      <header className="shrink-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-md mx-auto">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="Log out"
            onClick={() => void handleLogout()}
          >
            <LogOut className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-lg text-foreground">{currentTab.title}</h1>
          <div className="relative" ref={notificationsRef}>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full relative"
              onClick={() => {
                setShowNotifications((v) => !v)
                if (!showNotifications) fetchNotifications()
              }}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Button>
            {showNotifications && (
              <NotificationPanel
                className="absolute top-11 right-0"
                notifications={notifications}
                markingRead={markingNotificationsRead}
                deletingAll={deletingAllNotifications}
                onMarkAllRead={markAllNotificationsRead}
                onDelete={deleteNotification}
                onDeleteAll={deleteAllNotifications}
                emptyMessage="No updates from your parent yet"
              />
            )}
          </div>
        </div>
      </header>

      {/* Tab Content — scrollable on small screens */}
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[4.5rem]">
        {activeTab === "card" && <CardScreen childId={childId} />}
        {activeTab === "learn" && <LearnScreen onInvestmentChange={handleInvestmentChange} childId={childId} />}
        {activeTab === "goals" && <GoalsScreen childId={childId} />}
        {activeTab === "score" && <ScoreScreen />}
        {activeTab === "challenges" && <ChallengesScreen childId={childId} />}
      </div>

      {/* Bottom Navigation */}
      <nav className="shrink-0 fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[60px]",
                  isActive ? "scale-105" : "opacity-70 hover:opacity-100"
                )}
              >
                <span
                  className={cn(
                    "text-xl transition-all",
                    isActive && "scale-110"
                  )}
                  style={isActive ? {
                    filter: "drop-shadow(0 0 8px oklch(0.65 0.25 330))"
                  } : undefined}
                >
                  {tab.icon}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium transition-all",
                    isActive 
                      ? "bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent font-bold"
                      : "text-muted-foreground"
                  )}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
        {/* Safe area for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-card" />
      </nav>
    </div>
  )
}
