"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ParentApprovalAlert } from "@/components/piggybank/parent-approval-alert"
import { CardManagement } from "@/components/piggybank/card-management"
import { TopUpFlow } from "@/components/piggybank/top-up-flow"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Bell,
  CreditCard,
  Settings,
  TrendingUp,
  TrendingDown,
  Shield,
  ChevronRight,
  Plus,
  Wallet,
  BookOpen,
  LogOut,
  Loader2,
  X,
  Copy,
  Trash2,
  Key,
  Eye,
  Target,
  Check,
} from "lucide-react"
import { formatEuros } from "@/lib/currency"
import {
  formatCardNumberFull,
  getCardCvv,
  getCardExpiry,
  maskCardNumber,
} from "@/lib/card-details"
import { getCardGradientStyle } from "@/lib/theme"
import { cn } from "@/lib/utils"
import type { NotificationItem } from "@/components/piggybank/notification-panel"

export interface ParentChild {
  id: string
  name: string
  surname?: string
  avatar: string
  avatarEmoji?: string
  balance: number
  spent: number
  cardLastFour: string
  cardNumber?: string
  cardNumberMasked?: string
  loginCode: string
  loginCodeExpiresAt?: string
  loginCodeExpiresIn?: number
  color: string
  cardFrozen?: boolean
}

function otpSecondsLeft(expiresAt?: string): number {
  if (!expiresAt) return 60
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
}

interface ParentActivityItem {
  id: string
  childName: string
  merchant: string
  category: string
  categoryIcon: string
  amount: number
  direction: "in" | "out"
  time: string
  status: "approved" | "blocked" | "completed"
}

const CHILD_AVATAR_OPTIONS = ["🐣", "🐰", "🦊", "🐻", "🦁", "🐯"] as const

const INVESTMENT_GRADIENTS = [
  "from-pink-400 to-purple-500",
  "from-blue-400 to-cyan-500",
  "from-emerald-400 to-teal-500",
] as const

type ChildInvestment = {
  childName?: string
  invested: number
  currentValue: number
  profit: number
  profitPercent: number
  portfolio: Array<{ company: string; emoji: string; amount: number; shares: number }>
}

// Mock pending approvals
const mockApproval = {
  childName: "Emma",
  merchantName: "Pizza Palace",
  category: "food" as const,
  piggyCoins: 12,
  euroAmount: 1.20,
  location: "High Street, London",
}

export default function ParentDashboard() {
  const [showApprovalAlert, setShowApprovalAlert] = useState(false)
  const [showTopUpFlow, setShowTopUpFlow] = useState(false)
  const [approvalResult, setApprovalResult] = useState<"approved" | "declined" | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [parentName, setParentName] = useState("Parent")
  const [parentEmail, setParentEmail] = useState("")
  const [children, setChildren] = useState<ParentChild[]>([])
  const [childrenLoading, setChildrenLoading] = useState(true)
  const [addChildModal, setAddChildModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [markingNotificationsRead, setMarkingNotificationsRead] = useState(false)
  const [deletingAllNotifications, setDeletingAllNotifications] = useState(false)
  const [selectedChild, setSelectedChild] = useState<ParentChild | null>(null)
  const [showControlsSheet, setShowControlsSheet] = useState(false)
  const [controlsPanel, setControlsPanel] = useState<"limits" | "statements">("limits")
  const [newChildName, setNewChildName] = useState("")
  const [newChildSurname, setNewChildSurname] = useState("")
  const [newChildPassword, setNewChildPassword] = useState("")
  const [newChildCardNumber, setNewChildCardNumber] = useState("")
  const [newChildCardHolder, setNewChildCardHolder] = useState("")
  const [newChildCardCvv, setNewChildCardCvv] = useState("")
  const [newChildCardExpiry, setNewChildCardExpiry] = useState("")
  const [newChildAge, setNewChildAge] = useState(10)
  const [newChildAvatar, setNewChildAvatar] = useState<string>(CHILD_AVATAR_OPTIONS[0])
  const [addChildLoading, setAddChildLoading] = useState(false)
  const [addChildError, setAddChildError] = useState<string | null>(null)
  const [childAddedModal, setChildAddedModal] = useState<{
    name: string
    surname: string
    loginCode: string
    loginCodeExpiresAt?: string
  } | null>(null)
  const [otpTick, setOtpTick] = useState(0)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [spendAlerts, setSpendAlerts] = useState(true)
  const [lowBalanceAlerts, setLowBalanceAlerts] = useState(true)
  const [weeklyReport, setWeeklyReport] = useState(false)
  const [childInvestments, setChildInvestments] = useState<Record<string, ChildInvestment>>({})
  const [loadingInvestments, setLoadingInvestments] = useState(true)
  const [dividendPaid, setDividendPaid] = useState<Record<string, boolean>>({})
  const [dividendModal, setDividendModal] = useState<{
    childId: string
    childName: string
    amount: number
    profitPercent: number
  } | null>(null)
  const [quizRewards, setQuizRewards] = useState<Record<string, number>>({})
  const [quizRewardsSaving, setQuizRewardsSaving] = useState(false)
  const [autoDividend, setAutoDividend] = useState(false)
  const [dividendRate, setDividendRate] = useState("10")
  const [recentActivity, setRecentActivity] = useState<ParentActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const [pinCodeModal, setPinCodeModal] = useState<{
    childName: string
    code: string
  } | null>(null)
  const [revealedCardChildId, setRevealedCardChildId] = useState<string | null>(null)
  const [cardRevealPassword, setCardRevealPassword] = useState("")
  const [cardRevealLoading, setCardRevealLoading] = useState(false)
  const [expandedCardDetails, setExpandedCardDetails] = useState<string | null>(null)
  const [showTaskSheet, setShowTaskSheet] = useState(false)
  const [taskChildId, setTaskChildId] = useState("")
  const [taskName, setTaskName] = useState("")
  const [taskDescription, setTaskDescription] = useState("")
  const [taskEmoji, setTaskEmoji] = useState("🏠")
  const [taskTargetPc, setTaskTargetPc] = useState(20)
  const [taskRewardPc, setTaskRewardPc] = useState(10)
  const [taskRewardXp, setTaskRewardXp] = useState(25)
  const [taskSaving, setTaskSaving] = useState(false)

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true)
    try {
      const res = await fetch("/api/parent/activity")
      if (res.ok) setRecentActivity(await res.json())
    } catch (e) {
      console.error("Failed to fetch activity", e)
    } finally {
      setActivityLoading(false)
    }
  }, [])

  const fetchInvestments = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/investments")
      if (res.ok) {
        const data = await res.json()
        setChildInvestments(data)
      }
    } catch (e) {
      console.error("Failed to fetch investments", e)
    } finally {
      setLoadingInvestments(false)
    }
  }, [])

  const fetchChildren = useCallback(async (): Promise<ParentChild[]> => {
    setChildrenLoading(true)
    try {
      const res = await fetch("/api/parent/children")
      if (res.ok) {
        const list: ParentChild[] = await res.json()
        setChildren(list)
        return list
      }
    } finally {
      setChildrenLoading(false)
    }
    return []
  }, [])

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/parent/notifications", { cache: "no-store" })
    if (res.ok) setNotifications(await res.json())
  }, [])

  const markAllNotificationsRead = useCallback(async () => {
    setMarkingNotificationsRead(true)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try {
      const res = await fetch("/api/parent/notifications/read-all", { method: "POST" })
      if (!res.ok) {
        await fetchNotifications()
      }
    } catch {
      await fetchNotifications()
    } finally {
      setMarkingNotificationsRead(false)
    }
  }, [fetchNotifications])

  const deleteNotification = useCallback(async (id: number) => {
    await fetch(`/api/parent/notifications/${id}`, { method: "DELETE" })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    setToast("Notification deleted")
    setTimeout(() => setToast(null), 2000)
  }, [])

  const deleteAllNotifications = useCallback(async () => {
    setDeletingAllNotifications(true)
    try {
      const res = await fetch("/api/parent/notifications", { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete")
      setNotifications([])
      setToast("All notifications cleared")
      setTimeout(() => setToast(null), 2000)
    } catch {
      await fetchNotifications()
    } finally {
      setDeletingAllNotifications(false)
    }
  }, [fetchNotifications])

  const generatePinCode = async (child: ParentChild, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/children/${child.id}/pin-reveal/generate`, {
        method: "POST",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed")
      setPinCodeModal({ childName: child.name, code: data.code })
    } catch {
      setToast("Could not generate PIN code")
      setTimeout(() => setToast(null), 3000)
    }
  }

  const confirmCardReveal = async (child: ParentChild) => {
    setCardRevealLoading(true)
    try {
      const res = await fetch("/api/auth/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cardRevealPassword }),
      })
      const data = await res.json()
      if (!data.valid) {
        setToast("Incorrect password")
        setTimeout(() => setToast(null), 3000)
        return
      }
      setRevealedCardChildId(child.id)
      setCardRevealPassword("")
      setTimeout(() => setRevealedCardChildId(null), 30000)
    } finally {
      setCardRevealLoading(false)
    }
  }

  const createTask = async () => {
    if (!taskChildId || !taskName.trim()) return
    setTaskSaving(true)
    try {
      const res = await fetch("/api/parent/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: taskChildId,
          name: taskName,
          description: taskDescription,
          emoji: taskEmoji,
          targetPc: taskTargetPc,
          rewardPc: taskRewardPc,
          rewardXp: taskRewardXp,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setShowTaskSheet(false)
      setTaskName("")
      setTaskDescription("")
      setToast("Task created for your child")
    } catch {
      setToast("Could not create task")
    } finally {
      setTaskSaving(false)
      setTimeout(() => setToast(null), 3000)
    }
  }

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) {
          router.replace("/auth")
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (!data) return
        if (data.userType !== "parent") {
          router.replace("/auth")
          return
        }
        setParentName(data.name ?? "Parent")
        setParentEmail(data.email ?? "")
        setAuthChecked(true)
      })
      .catch(() => router.replace("/auth"))
  }, [router])

  useEffect(() => {
    if (authChecked) {
      fetchChildren()
      fetchNotifications()
      fetchInvestments()
      fetchActivity()
    }
  }, [authChecked, fetchChildren, fetchNotifications, fetchInvestments, fetchActivity])

  useEffect(() => {
    const id = setInterval(() => setOtpTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!authChecked || children.length === 0) return
    const windowEnded = children.some(
      (c) => c.loginCodeExpiresAt && otpSecondsLeft(c.loginCodeExpiresAt) === 0
    )
    if (windowEnded) void fetchChildren()
  }, [otpTick, authChecked, children, fetchChildren])

  useEffect(() => {
    if (!selectedChild) return
    const fresh = children.find((c) => c.id === selectedChild.id)
    if (
      fresh &&
      (fresh.loginCode !== selectedChild.loginCode ||
        fresh.loginCodeExpiresAt !== selectedChild.loginCodeExpiresAt)
    ) {
      setSelectedChild(fresh)
    }
  }, [children, selectedChild])

  useEffect(() => {
    if (!authChecked) return
    const refresh = () => {
      fetchChildren()
      fetchNotifications()
    }
    window.addEventListener("focus", refresh)
    return () => window.removeEventListener("focus", refresh)
  }, [authChecked, fetchChildren, fetchNotifications])

  const fetchQuizRewards = useCallback(async () => {
    try {
      const res = await fetch("/api/parent/quiz-rewards", { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (data.rewards && typeof data.rewards === "object") {
        setQuizRewards(data.rewards)
      }
    } catch {
      // keep local defaults
    }
  }, [])

  useEffect(() => {
    if (!authChecked) return
    void fetchQuizRewards()
  }, [authChecked, fetchQuizRewards])

  useEffect(() => {
    if (children.length === 0) return
    setQuizRewards((prev) => {
      const next = { ...prev }
      for (const child of children) {
        if (next[child.id] === undefined) next[child.id] = 10
      }
      return next
    })
  }, [children])

  const handleSaveQuizRewards = async () => {
    setQuizRewardsSaving(true)
    try {
      const res = await fetch("/api/parent/quiz-rewards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewards: quizRewards }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save")
      }
      if (data.rewards) setQuizRewards(data.rewards)
      setToast("Quiz reward settings saved")
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not save quiz settings")
      setTimeout(() => setToast(null), 4000)
    } finally {
      setQuizRewardsSaving(false)
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length
  const totalBalance = children.reduce((s, c) => s + c.balance, 0)
  const totalSpentToday = children.reduce((s, c) => s + c.spent, 0)

  const topUpChildren = children.map((c) => ({
    id: c.id,
    name: c.name,
    avatar: c.avatar,
    avatarEmoji: c.avatarEmoji,
    balance: c.balance,
    cardLastFour: c.cardLastFour,
    color: c.color,
  }))

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/auth")
  }

  const openControls = async (child?: ParentChild, panel: "limits" | "statements" = "limits") => {
    const list = await fetchChildren()
    await fetchNotifications()
    const pick = child ?? selectedChild ?? list[0] ?? children[0]
    if (!pick) return
    const fresh = list.find((c) => c.id === pick.id) ?? pick
    setSelectedChild(fresh)
    setControlsPanel(panel)
    setShowControlsSheet(true)
  }

  const openReports = (child?: ParentChild) => openControls(child, "statements")

  const handleChildFreezeChange = (frozen: boolean) => {
    if (!selectedChild) return
    setSelectedChild({ ...selectedChild, cardFrozen: frozen })
    setChildren((prev) =>
      prev.map((c) => (c.id === selectedChild.id ? { ...c, cardFrozen: frozen } : c))
    )
  }

  const handleDeleteChild = async () => {
    if (!selectedChild) return
    const res = await fetch(`/api/parent/children/${selectedChild.id}`, { method: "DELETE" })
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    if (!res.ok) {
      const msg = data.error ?? "Failed to delete child"
      setToast(msg)
      setTimeout(() => setToast(null), 4000)
      throw new Error(msg)
    }
    const name = selectedChild.name
    setShowControlsSheet(false)
    setSelectedChild(null)
    await fetchChildren()
    setToast(`${name} removed`)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddChildError(null)
    setAddChildLoading(true)
    try {
      const res = await fetch("/api/parent/children", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newChildName,
          surname: newChildSurname,
          password: newChildPassword,
          age: newChildAge,
          avatarEmoji: newChildAvatar,
          cardNumber: newChildCardNumber.replace(/\s/g, ""),
          cardHolder: newChildCardHolder,
          cardCvv: newChildCardCvv,
          cardExpiry: newChildCardExpiry,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddChildError(data.error ?? "Failed to add child")
        return
      }
      setAddChildModal(false)
      setNewChildName("")
      setNewChildSurname("")
      setNewChildPassword("")
      setNewChildCardNumber("")
      setNewChildCardHolder("")
      setNewChildCardCvv("")
      setNewChildCardExpiry("")
      setNewChildAge(10)
      setNewChildAvatar(CHILD_AVATAR_OPTIONS[0])
      setChildAddedModal({
        name: data.name,
        surname: data.surname ?? newChildSurname,
        loginCode: data.loginCode,
        loginCodeExpiresAt: data.loginCodeExpiresAt,
      })
      await fetchChildren()
      setToast("Child added successfully!")
      setTimeout(() => setToast(null), 3000)
    } catch {
      setAddChildError("Something went wrong")
    } finally {
      setAddChildLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleteLoading(true)
    try {
      await fetch("/api/parent/account", { method: "DELETE" })
      router.push("/auth")
    } finally {
      setDeleteLoading(false)
    }
  }

  const calculateSuggestedDividend = (profit: number) => {
    if (profit <= 0) return 0
    return Math.round(profit * (parseInt(dividendRate, 10) / 100))
  }

  const handlePayDividend = async () => {
    if (!dividendModal) return
    try {
      const res = await fetch("/api/parent/pay-dividend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: dividendModal.childId,
          amount: dividendModal.amount,
        }),
      })
      if (!res.ok) throw new Error("Failed to pay dividend")
      setDividendPaid((prev) => ({ ...prev, [dividendModal.childId]: true }))
      setToast(`You paid ${dividendModal.amount} PC dividend to ${dividendModal.childName}!`)
      setDividendModal(null)
      await fetchChildren()
      await fetchInvestments()
    } catch {
      setToast("Failed to pay dividend")
    } finally {
      setTimeout(() => setToast(null), 3000)
    }
  }

  const formatTimeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  const handleApprove = () => {
    setShowApprovalAlert(false)
    setApprovalResult("approved")
    setTimeout(() => setApprovalResult(null), 3000)
  }

  const handleDecline = () => {
    setShowApprovalAlert(false)
    setApprovalResult("declined")
    setTimeout(() => setApprovalResult(null), 3000)
  }

  const headerClass = "bg-white border-b border-border text-foreground shadow-sm"
  const headerMuted = "text-muted-foreground"
  const iconBtnClass = "bg-secondary hover:bg-muted text-foreground"
  const statCardClass = "bg-secondary text-foreground border border-border"
  const statMuted = "text-muted-foreground"

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 shadow-lg animate-in slide-in-from-top">
          <p className="text-emerald-700 font-medium text-sm">{toast}</p>
        </div>
      )}

      {/* Header */}
      <header className={cn("px-6 pt-12 pb-8", headerClass)}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className={cn("text-sm", headerMuted)}>Good evening,</p>
              <h1 className="text-2xl font-bold">{parentName}</h1>
            </div>
            <div className="flex items-center gap-3 relative">
              <button
                type="button"
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn("relative p-2 rounded-full transition-colors", iconBtnClass)}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center font-bold">
                    {unreadCount}
                </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className={cn("p-2 rounded-full transition-colors", iconBtnClass)}
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className={cn("p-2 rounded-full transition-colors", iconBtnClass)}
                aria-label="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
              {showNotifications && (
                <div className="absolute top-12 right-0 bg-white rounded-2xl shadow-xl border border-slate-200 w-80 z-50 text-slate-900">
                  <div className="flex items-center justify-between gap-2 p-3 border-b">
                    <span className="font-semibold text-sm shrink-0">Notifications</span>
                    {notifications.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <button
                          type="button"
                          className="text-xs text-primary font-medium disabled:opacity-50"
                          disabled={markingNotificationsRead || unreadCount === 0}
                          onClick={() => void markAllNotificationsRead()}
                        >
                          {markingNotificationsRead ? "Saving…" : "Mark all read"}
                        </button>
                        <button
                          type="button"
                          className="text-xs text-red-600 font-medium disabled:opacity-50"
                          disabled={deletingAllNotifications}
                          onClick={() => void deleteAllNotifications()}
                        >
                          {deletingAllNotifications ? "Deleting…" : "Delete all"}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">No notifications yet</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className={cn(
                            "p-3 border-b last:border-0 flex gap-2 items-start",
                            n.isRead && "opacity-60"
                          )}
                        >
                          {!n.isRead ? (
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full mt-1.5 shrink-0",
                              n.type === "success" || n.type === "top_up"
                                ? "bg-emerald-500"
                                : n.type === "alert" || n.type === "card_frozen"
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                            )}
                          />
                          ) : (
                            <span className="w-2 h-2 mt-1.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">{n.title}</p>
                            <p className="text-xs text-muted-foreground">{n.body}</p>
                            <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(n.createdAt)}</p>
                          </div>
                          <button
                            type="button"
                            aria-label="Delete notification"
                            onClick={() => void deleteNotification(n.id)}
                            className="shrink-0 text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className={cn("rounded-2xl p-4", statCardClass)}>
              <div className={cn("flex items-center gap-2 text-sm mb-1", statMuted)}>
                <Wallet className="w-4 h-4" />
                <span>Total Balance</span>
              </div>
              <p className="text-2xl font-bold">{totalBalance} <span className={cn("text-base font-normal", statMuted)}>PC</span></p>
              <p className={cn("text-sm", statMuted)}>{"\u20AC"}{(totalBalance / 10).toFixed(2)}</p>
            </div>
            <div className={cn("rounded-2xl p-4", statCardClass)}>
              <div className={cn("flex items-center gap-2 text-sm mb-1", statMuted)}>
                <TrendingUp className="w-4 h-4" />
                <span>This Week</span>
              </div>
              <p className="text-2xl font-bold">{totalSpentToday} <span className={cn("text-base font-normal", statMuted)}>PC</span></p>
              <p className={cn("text-sm", statMuted)}>spent today</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-6 max-w-lg mx-auto">
        {/* Result toast */}
        {approvalResult && (
          <div className={`mb-4 p-4 rounded-xl flex items-center gap-3 ${
            approvalResult === "approved" 
              ? "bg-emerald-50 border border-emerald-200" 
              : "bg-red-50 border border-red-200"
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              approvalResult === "approved" ? "bg-emerald-500" : "bg-red-500"
            } text-white font-bold`}>
              {approvalResult === "approved" ? "\u2713" : "\u2717"}
            </div>
            <p className={`font-medium ${
              approvalResult === "approved" ? "text-emerald-700" : "text-red-700"
            }`}>
              Payment {approvalResult === "approved" ? "approved" : "declined"}
            </p>
          </div>
        )}

        {/* Demo trigger */}
        <Card className="mb-6 p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-amber-900">Demo: Test Approval Alert</p>
              <p className="text-sm text-amber-700">Tap to see the approval flow</p>
            </div>
            <Button
              onClick={() => setShowApprovalAlert(true)}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              Trigger
            </Button>
          </div>
        </Card>

        {/* Children section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">Your Children</h2>
            <button
              type="button"
              onClick={() => setAddChildModal(true)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Child
            </button>
          </div>
          
          {childrenLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          ) : (
          <div className="space-y-3">
            {children.map((child) => (
              <Card 
                key={child.id}
                onClick={() => openControls(child)}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer border-border bg-card text-card-foreground"
              >
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 ring-2 ring-white shadow-lg">
                    <AvatarImage src={child.avatar} alt={child.name} />
                    <AvatarFallback className={`bg-gradient-to-br ${child.color} text-white font-bold text-lg`}>
                      {child.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground">{child.name}</h3>
                      {child.cardFrozen && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Frozen
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      {child.cardNumberMasked ?? `**** ${child.cardLastFour}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Login code:{" "}
                      <span className="font-mono font-semibold tracking-wider text-foreground">{child.loginCode}</span>
                      <span className="text-muted-foreground ml-1">
                        · {otpSecondsLeft(child.loginCodeExpiresAt)}s
                      </span>
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-sm text-muted-foreground">
                        Balance: <span className="font-medium text-foreground">{child.balance} PC</span>
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Spent today: <span className="font-medium text-foreground">{child.spent} PC</span>
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
                <div
                  className="mt-4 pt-4 border-t border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={(e) => generatePinCode(child, e)}
                    >
                      <Key className="w-3 h-3 mr-1" />
                      Generate Code
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() =>
                        setExpandedCardDetails(
                          expandedCardDetails === child.id ? null : child.id
                        )
                      }
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Card Details
                    </Button>
                  </div>
                  {expandedCardDetails === child.id && (
                    <div className="text-sm space-y-2">
                      {revealedCardChildId === child.id ? (
                        <div
                          className="rounded-xl p-4 text-white"
                          style={{ background: getCardGradientStyle("pink-purple") }}
                        >
                          <p className="font-mono text-lg tracking-wider">
                            {formatCardNumberFull(child.id, child.cardLastFour)}
                          </p>
                          <p className="mt-2">Cardholder: {child.name}</p>
                          <p>Expiry: {getCardExpiry()}</p>
                          <p>CVV: {getCardCvv(child.id)}</p>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="mt-3"
                            onClick={() => setRevealedCardChildId(null)}
                          >
                            Hide
                          </Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-mono text-slate-600">
                            Card Number: {maskCardNumber(child.cardLastFour)}
                          </p>
                          <p>Cardholder: {child.name}</p>
                          <p>Expiry: ••/••</p>
                          <p>CVV: •••</p>
                          <input
                            type="password"
                            placeholder="Your account password"
                            value={cardRevealPassword}
                            onChange={(e) => setCardRevealPassword(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border text-sm mt-2"
                          />
                          <Button
                            type="button"
                            size="sm"
                            disabled={cardRevealLoading}
                            onClick={() => confirmCardReveal(child)}
                          >
                            {cardRevealLoading ? "Checking…" : "Reveal"}
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          )}
        </section>

        {/* Quick actions */}
        <section className="mb-6">
          <h2 className="text-lg font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-3 gap-3">
            <button 
              onClick={() => setShowTopUpFlow(true)}
              className="p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center gap-2"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Add Funds</span>
            </button>
            <button type="button" onClick={() => openControls()} className="p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Controls</span>
            </button>
            <button type="button" onClick={() => openReports()} className="p-4 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-slate-700">Statements</span>
            </button>
          </div>
        </section>

        <p className="text-sm text-muted-foreground mb-6">
          Tap a child to manage their card, spending limits, investments, and statements, or delete their profile.
        </p>

        {/* Investment Overview */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-foreground">{"Children's Investments"}</h2>
          </div>

          {loadingInvestments ? (
            <div className="space-y-3 mb-4">
              <div className="animate-pulse bg-slate-100 rounded-2xl h-32 w-full" />
              <div className="animate-pulse bg-slate-100 rounded-2xl h-32 w-full" />
            </div>
          ) : Object.keys(childInvestments).length === 0 ? (
            <Card className="p-4 border-border shadow-sm mb-4 bg-card text-card-foreground">
              <p className="text-sm text-slate-600 text-center">
                No investments yet — children will appear here once they buy their first share 📈
              </p>
          </Card>
          ) : (
            Object.entries(childInvestments).map(([childId, inv], index) => {
              const childName = inv.childName ?? children.find((c) => c.id === childId)?.name ?? "Child"
              const gradient = INVESTMENT_GRADIENTS[index % INVESTMENT_GRADIENTS.length]
              const portfolioTotal = inv.portfolio.reduce((a, b) => a + b.amount, 0) || 1
              const isPositive = inv.profitPercent >= 0

              return (
                <div key={childId} className="mb-4">
                  <Card className="p-4 border-border shadow-sm mb-3 bg-card text-card-foreground">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10">
                        <AvatarFallback className={`bg-gradient-to-br ${gradient} text-white font-bold`}>
                          {childName.charAt(0)}
                        </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{childName}</h3>
                <div className="flex items-center gap-3 text-sm">
                          <span className="text-slate-500">
                            Invested: <span className="font-medium text-slate-700">{inv.invested} PC</span>
                          </span>
                          <span className="text-slate-500">
                            Value: <span className="font-medium text-slate-700">{inv.currentValue} PC</span>
                          </span>
                </div>
              </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1",
                            isPositive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                          )}
                        >
                          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isPositive ? "+" : ""}
                          {inv.profitPercent}%
                        </span>
                        {dividendPaid[childId] && (
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            Dividend paid ✅
                </span>
                        )}
              </div>
            </div>
            <Button
                      onClick={() =>
                        setDividendModal({
                          childId,
                          childName,
                          amount: calculateSuggestedDividend(inv.profit) || 1,
                          profitPercent: inv.profitPercent,
                        })
                      }
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl"
              size="sm"
            >
              Pay Dividend
            </Button>
          </Card>

                  <div className="px-1 mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Holdings</p>
                    {inv.portfolio.map((item, i) => (
                      <div key={`${item.company}-${i}`} className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="text-sm text-slate-600 flex-1">{item.company}</span>
                  <span className="text-sm font-medium text-slate-900">{item.amount} PC</span>
                          <span className="text-xs text-slate-400">{item.shares} shares</span>
                        </div>
                        <Progress value={(item.amount / portfolioTotal) * 100} className="h-1.5" />
                </div>
              ))}
            </div>
                </div>
              )
            })
          )}

          <hr className="border-slate-100 my-4" />

          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Learning & Rewards</h2>
            </div>

          <Card className="p-4 border-border shadow-sm mb-4 bg-card text-card-foreground">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-card-foreground">Quiz Completion Rewards</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Set how many PiggyCoins Child earns when they complete an investment lesson quiz.
            </p>
            <div className="space-y-3 mb-4">
              {children.map((child, idx) => (
                <div key={child.id} className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                    <AvatarFallback
                      className={cn(
                        "text-white font-bold text-sm bg-gradient-to-br",
                        INVESTMENT_GRADIENTS[idx % INVESTMENT_GRADIENTS.length]
                      )}
                    >
                      {child.name.charAt(0)}
                    </AvatarFallback>
                </Avatar>
                  <span className="text-sm text-slate-700 flex-1">{child.name}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                      value={quizRewards[child.id] ?? 10}
                      onChange={(e) =>
                        setQuizRewards((prev) => ({
                          ...prev,
                          [child.id]: parseInt(e.target.value, 10) || 0,
                        }))
                      }
                    className="w-16 px-2 py-1 text-sm border border-slate-200 rounded-lg text-center"
                  />
                  <span className="text-sm text-slate-500">PC</span>
                </div>
              </div>
              ))}
            </div>
            <Button
              type="button"
              className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl"
              size="sm"
              disabled={quizRewardsSaving || children.length === 0}
              onClick={() => void handleSaveQuizRewards()}
            >
              {quizRewardsSaving ? "Saving…" : "Save Settings"}
            </Button>
          </Card>

          <Card className="p-4 border-border shadow-sm bg-card text-card-foreground">
            <h3 className="font-semibold text-slate-900 mb-3">Set Dividend Rules</h3>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-700">Auto-pay dividends weekly</span>
              <button
                type="button"
                onClick={() => setAutoDividend(!autoDividend)}
                className={`w-12 h-6 rounded-full transition-colors ${autoDividend ? "bg-emerald-500" : "bg-slate-300"}`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${autoDividend ? "translate-x-6" : "translate-x-0.5"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-700">Dividend rate</span>
              <select
                value={dividendRate}
                onChange={(e) => setDividendRate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
              >
                <option value="10">10% of profit</option>
                <option value="20">20% of profit</option>
                <option value="50">50% of profit</option>
              </select>
            </div>
            <p className="text-xs text-slate-400">
              Dividends are paid from your parent wallet to your child&apos;s PiggyCoins balance.
            </p>
          </Card>
        </section>

        <section className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-slate-700" />
            <h2 className="text-lg font-bold text-slate-900">Set Tasks for Children</h2>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-xl mb-4"
            onClick={() => {
              setTaskChildId(children[0]?.id ?? "")
              setShowTaskSheet(true)
            }}
          >
            + Create Task
          </Button>
        </section>

        <section className="mb-6 mt-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Activity</h2>
          <Card className="divide-y divide-border border-border bg-card text-card-foreground">
            {activityLoading ? (
              <div className="p-6 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="p-4 text-sm text-slate-500 text-center">No activity yet</p>
            ) : (
              recentActivity.map((activity) => {
                const isIn = activity.direction === "in"
                const amountLabel =
                  activity.amount > 0
                    ? `${isIn ? "+" : activity.status === "blocked" ? "" : "-"}${activity.amount} PC`
                    : ""
                const statusLabel =
                  activity.status === "completed"
                    ? "Completed"
                    : activity.status === "approved"
                      ? "Approved"
                      : "Blocked"
                const statusClass =
                  activity.status === "blocked"
                    ? "bg-red-100 text-red-700"
                    : activity.status === "completed"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-emerald-100 text-emerald-700"

                return (
                  <div key={activity.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xl shrink-0">{activity.categoryIcon}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          <span className="text-slate-600">{activity.childName}</span> — {activity.merchant}
                        </p>
                        <p className="text-sm text-slate-500 capitalize">
                          {activity.category.replace(/_/g, " ")} • {activity.time}
                          {amountLabel ? ` • ${amountLabel}` : ""}
                        </p>
                      </div>
                </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusClass}`}>
                      {statusLabel}
                </span>
              </div>
                )
              })
            )}
          </Card>
        </section>
      </main>


      {/* Parent Approval Alert */}
      <ParentApprovalAlert
        isOpen={showApprovalAlert}
        onClose={() => setShowApprovalAlert(false)}
        onApprove={handleApprove}
        onDecline={handleDecline}
        childName={mockApproval.childName}
        merchantName={mockApproval.merchantName}
        category={mockApproval.category}
        piggyCoins={mockApproval.piggyCoins}
        euroAmount={mockApproval.euroAmount}
        location={mockApproval.location}
        timeoutSeconds={60}
      />

      {/* Top Up Flow */}
      <TopUpFlow
        isOpen={showTopUpFlow}
        onClose={() => setShowTopUpFlow(false)}
        children={topUpChildren}
        onSuccess={fetchChildren}
      />

      {addChildModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setAddChildModal(false)}
          role="presentation"
        >
          <div
            className="bg-white text-slate-900 rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[min(92vh,900px)] flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Add a Child</h2>
              <button
                type="button"
                onClick={() => setAddChildModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              onSubmit={handleAddChild}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">First name</label>
                  <input placeholder="e.g. Emma" value={newChildName} onChange={(e) => setNewChildName(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Surname</label>
                  <input placeholder="e.g. Smith" value={newChildSurname} onChange={(e) => setNewChildSurname(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Password</label>
                  <input type="password" placeholder="Child account password" value={newChildPassword} onChange={(e) => setNewChildPassword(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" required minLength={4} />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Stored for the child profile. They sign in with a 6-digit login code shown on this dashboard.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Age (years)</label>
                  <input type="number" min={6} max={18} value={newChildAge} onChange={(e) => setNewChildAge(Number(e.target.value))} className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-2 block">Avatar</label>
                  <div className="grid grid-cols-6 gap-2">
                    {CHILD_AVATAR_OPTIONS.map((emoji) => (
                      <button key={emoji} type="button" onClick={() => setNewChildAvatar(emoji)} className={cn("text-2xl p-2 rounded-xl border bg-white", newChildAvatar === emoji ? "ring-2 ring-primary border-primary" : "border-slate-200")}>{emoji}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Card number</label>
                  <input
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    value={newChildCardNumber}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, "").slice(0, 16)
                      setNewChildCardNumber(raw.replace(/(.{4})/g, "$1 ").trim())
                    }}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-widest"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600 mb-1 block">Card holder name</label>
                  <input
                    placeholder="EMMA SMITH"
                    value={newChildCardHolder}
                    onChange={(e) => setNewChildCardHolder(e.target.value.toUpperCase())}
                    className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary uppercase tracking-wide"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-600 mb-1 block">Expiry date</label>
                    <input
                      placeholder="MM/YY"
                      maxLength={5}
                      value={newChildCardExpiry}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, "").slice(0, 4)
                        setNewChildCardExpiry(raw.length > 2 ? `${raw.slice(0, 2)}/${raw.slice(2)}` : raw)
                      }}
                      className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>
                  <div className="w-28">
                    <label className="text-sm font-medium text-slate-600 mb-1 block">CVV</label>
                    <input
                      placeholder="123"
                      maxLength={4}
                      type="password"
                      value={newChildCardCvv}
                      onChange={(e) => setNewChildCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      className="w-full h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                    />
                  </div>
                </div>
                {addChildError && <p className="text-sm text-red-600">{addChildError}</p>}
              </div>
              <div className="shrink-0 px-5 pb-6 pt-3 border-t border-slate-200 space-y-2">
                <button type="submit" disabled={addChildLoading} className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold flex items-center justify-center gap-2">
                  {addChildLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Add Child"}
                </button>
                <button type="button" onClick={() => setAddChildModal(false)} className="w-full text-sm text-slate-500 hover:text-slate-700">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {childAddedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white text-slate-900 rounded-3xl p-6 max-w-sm w-full shadow-xl relative">
            <button
              type="button"
              onClick={() => setChildAddedModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 text-slate-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-center mb-2">
              <strong>{childAddedModal.name} {childAddedModal.surname}</strong> was added.
            </p>
            <p className="text-center text-sm text-muted-foreground mb-4">
              One-time login code (valid 60 seconds, then refreshes):
            </p>
            <p className="text-center text-3xl font-mono font-bold tracking-[0.3em] mb-1">
              {childAddedModal.loginCode}
            </p>
            <p className="text-center text-sm text-muted-foreground mb-4">
              Expires in {otpSecondsLeft(childAddedModal.loginCodeExpiresAt)}s
            </p>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(childAddedModal.loginCode)
                setToast("Login code copied!")
                setTimeout(() => setToast(null), 2000)
              }}
              className="w-full h-12 rounded-2xl border flex items-center justify-center gap-2 mb-2"
            >
              <Copy className="w-4 h-4" /> Copy login code
            </button>
            <button
              type="button"
              onClick={() => setChildAddedModal(null)}
              className="w-full h-12 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {showSettings && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
          role="presentation"
        >
          <div
            className="bg-white text-slate-900 rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[min(92vh,900px)] flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">Settings</h2>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <section className="mb-6">
              <h3 className="font-semibold text-sm text-slate-900 mb-2">Account</h3>
              <p className="text-sm text-slate-800">{parentName}</p>
              <p className="text-sm text-slate-600">{parentEmail}</p>
            </section>
            <section className="mb-6 space-y-3">
              <h3 className="font-semibold text-sm text-slate-900">Notifications</h3>
              <label className="flex justify-between items-center text-sm"><span>Spend alerts</span><input type="checkbox" checked={spendAlerts} onChange={(e) => setSpendAlerts(e.target.checked)} /></label>
              <label className="flex justify-between items-center text-sm"><span>Low balance alerts</span><input type="checkbox" checked={lowBalanceAlerts} onChange={(e) => setLowBalanceAlerts(e.target.checked)} /></label>
              <label className="flex justify-between items-center text-sm"><span>Weekly report</span><input type="checkbox" checked={weeklyReport} onChange={(e) => setWeeklyReport(e.target.checked)} /></label>
            </section>
            <section>
              <h3 className="font-semibold text-sm text-red-600 mb-2">Danger Zone</h3>
              {!deleteConfirm ? (
                <button type="button" onClick={() => setDeleteConfirm(true)} className="w-full h-12 rounded-2xl border border-red-300 text-red-600 font-semibold">Delete Account</button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600">This permanently deletes your account and all children.</p>
                  <button type="button" onClick={handleDeleteAccount} disabled={deleteLoading} className="w-full h-12 rounded-2xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2">
                    {deleteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm delete"}
                  </button>
                  <button type="button" onClick={() => setDeleteConfirm(false)} className="w-full text-sm text-slate-500">Cancel</button>
                </div>
              )}
            </section>
            </div>
          </div>
        </div>
      )}

      {dividendModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 animate-in slide-in-from-bottom duration-300">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white font-bold">
                    {dividendModal.childName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{dividendModal.childName}</h3>
                  <p className="text-sm text-slate-500">
                    Investment profit: {dividendModal.profitPercent >= 0 ? "+" : ""}
                    {dividendModal.profitPercent}%
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDividendModal(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-slate-700 block mb-2">Dividend amount (PC)</label>
              <input
                type="number"
                min={1}
                value={dividendModal.amount}
                onChange={(e) =>
                  setDividendModal({
                    ...dividendModal,
                    amount: parseInt(e.target.value, 10) || 1,
                  })
                }
                className="w-full px-4 py-3 text-lg border border-slate-200 rounded-xl text-center font-bold"
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                Suggested: {calculateSuggestedDividend(
                  childInvestments[dividendModal.childId]?.profit ?? 0
                )}{" "}
                PC ({dividendRate}% of profit)
              </p>
            </div>
            <Button
              onClick={handlePayDividend}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-6 text-lg font-semibold"
            >
              Pay {dividendModal.amount} PC Dividend
            </Button>
          </div>
        </div>
      )}

      {pinCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <button
              type="button"
              className="float-right text-slate-400"
              onClick={() => setPinCodeModal(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <p className="text-sm text-slate-600 mb-2">One-time PIN code for {pinCodeModal.childName}</p>
            <p className="text-5xl font-bold tracking-widest text-slate-900 my-4">{pinCodeModal.code}</p>
            <p className="text-xs text-slate-500 mb-4">Expires in 5 minutes</p>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                void navigator.clipboard.writeText(pinCodeModal.code)
                setToast("Code copied")
                setTimeout(() => setToast(null), 2000)
              }}
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy code
            </Button>
          </div>
        </div>
      )}

      {showTaskSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowTaskSheet(false)}
          role="presentation"
        >
          <div
            className="bg-white text-slate-900 rounded-t-3xl w-full max-w-lg max-h-[min(92vh,900px)] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-200">
              <h2 className="font-bold text-lg text-slate-900">Create Task</h2>
              <button
                type="button"
                onClick={() => setShowTaskSheet(false)}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
            <p className="text-sm text-muted-foreground mb-2">Assign to</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setTaskChildId(c.id)}
                  className={cn(
                    "w-10 h-10 rounded-full text-lg border-2",
                    taskChildId === c.id ? "border-primary ring-2 ring-primary/30" : "border-transparent"
                  )}
                >
                  {c.avatarEmoji ?? c.name.charAt(0)}
                </button>
              ))}
            </div>
            <input
              className="w-full border rounded-xl px-3 py-2 mb-3"
              placeholder="Task name"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
            />
            <input
              className="w-full border rounded-xl px-3 py-2 mb-3"
              placeholder="Description"
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
            />
            <p className="text-sm mb-2">Emoji</p>
            <div className="flex gap-2 mb-4">
              {["🏠", "📚", "🧹", "🐕", "🌱", "⭐"].map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setTaskEmoji(e)}
                  className={cn("text-2xl p-2 rounded-lg", taskEmoji === e && "bg-primary/10 ring-2 ring-primary")}
                >
                  {e}
                </button>
              ))}
            </div>
            <label className="text-sm block mb-1">Target amount (PC)</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2 mb-3" value={taskTargetPc} onChange={(e) => setTaskTargetPc(Number(e.target.value))} />
            <label className="text-sm block mb-1">Reward PiggyCoins</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2 mb-3" value={taskRewardPc} onChange={(e) => setTaskRewardPc(Number(e.target.value))} />
            <label className="text-sm block mb-1">Reward XP</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2 mb-4" value={taskRewardXp} onChange={(e) => setTaskRewardXp(Number(e.target.value))} />
            </div>
            <div className="shrink-0 px-5 pb-6 pt-2 border-t border-slate-200">
              <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-white" disabled={taskSaving} onClick={createTask}>
                {taskSaving ? "Creating…" : "Create Task"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showControlsSheet && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowControlsSheet(false)}
          role="presentation"
        >
          <div
            className="bg-white text-slate-900 rounded-t-3xl shadow-2xl w-full max-w-lg max-h-[min(92vh,900px)] flex flex-col animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 text-base pr-2">
                {selectedChild?.name ?? "Child"}
                {controlsPanel === "statements" ? " — Statements" : " — Card controls"}
              </h2>
              <button
                type="button"
                onClick={() => setShowControlsSheet(false)}
                className="shrink-0 p-2 rounded-full hover:bg-slate-100 text-slate-700"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {selectedChild && (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-6">
                <div className="mx-1 mb-4 mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1">One-time login code</p>
                  <p className="font-mono text-xl font-bold tracking-widest text-slate-900">
                    {selectedChild.loginCode}
                  </p>
                  <p className="text-xs text-amber-600 mt-1 font-medium">
                    Refreshes in {otpSecondsLeft(selectedChild.loginCodeExpiresAt)}s
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedChild.name}
                    {selectedChild.surname ? ` ${selectedChild.surname}` : ""} enters this at{" "}
                    <span className="text-primary font-medium">/auth/child</span> before it expires
                  </p>
                </div>
                <CardManagement
                  key={`${selectedChild.id}-${selectedChild.cardFrozen ? "frozen" : "active"}-${controlsPanel}`}
                  hideTitle
                  childDbId={selectedChild.id}
                  initialPanel={controlsPanel}
                  onDeleteChild={handleDeleteChild}
                  onFreezeChange={handleChildFreezeChange}
                  child={{
                    id: selectedChild.id,
                    name: selectedChild.name,
                    cardNumber: selectedChild.cardNumber ?? selectedChild.cardLastFour,
                    balance: selectedChild.balance,
                    color: selectedChild.color,
                    cardFrozen: selectedChild.cardFrozen,
                    status: selectedChild.cardFrozen ? "frozen" : "active",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

