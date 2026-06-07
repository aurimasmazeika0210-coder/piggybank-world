"use client"

import { useState, useEffect, useCallback } from "react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { 
  Snowflake, 
  Play,
  SlidersHorizontal, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Utensils,
  Bus,
  GraduationCap,
  Tv,
  Gamepad2,
  MoreHorizontal,
  Clock,
  ShieldAlert,
  Loader2,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCardNumberDisplay, maskCardNumber } from "@/lib/card-display"
import { defaultChildCardLimits, type ChildCardLimits } from "@/lib/card-limits"
import { setParentCardFrozen } from "@/lib/api-client"

interface ChildCard {
  id: number
  name: string
  avatar: string
  cardNumber: string
  status: "active" | "frozen" | "pending"
  balance: number
  color: string
}

/** Pass from parent dashboard to show one real child instead of demo data */
export interface CardManagementChild {
  id: string | number
  name: string
  cardNumber: string
  balance: number
  color: string
  avatar?: string
  cardFrozen?: boolean
  status?: "active" | "frozen" | "pending"
}

interface StatementsData {
  balance: number
  totalInvested: number
  portfolioValue: number
  profitLoss: number
  lessonsCompleted: number
  portfolio: Array<{
    companyName: string
    icon: string
    shares: number
    value: number
    profitLoss: number
  }>
  transactions: Array<{
    id: string
    merchant: string
    amount: number
    time: string
    status: "approved" | "blocked"
  }>
}

interface CardManagementProps {
  child?: CardManagementChild
  /** Database child id for statements API and delete */
  childDbId?: string
  hideTitle?: boolean
  initialPanel?: "limits" | "statements"
  onDeleteChild?: () => Promise<void>
  onFreezeChange?: (frozen: boolean) => void
}

function cardDisplayNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, "")
  if (digits.length >= 8) {
    return formatCardNumberDisplay(cardNumber)
  }
  return maskCardNumber(cardNumber, cardNumber)
}

function toChildCard(child: CardManagementChild): ChildCard {
  const status =
    child.status ??
    (child.cardFrozen ? "frozen" : "active")
  return {
    id: 1,
    name: child.name,
    avatar: child.avatar ?? "",
    cardNumber: child.cardNumber,
    status,
    balance: child.balance,
    color: child.color,
  }
}

interface CategoryLimit {
  id: string
  name: string
  icon: React.ReactNode
  enabled: boolean
  dailyLimit: number
}

interface CardLimits {
  dailyCap: number
  perTransactionCap: number
  categories: CategoryLimit[]
  schoolDaysOnly: boolean
  approvalThreshold: number
}

const childCards: ChildCard[] = [
  { 
    id: 1, 
    name: "Emma", 
    avatar: "", 
    cardNumber: "4521",
    status: "active",
    balance: 45,
    color: "from-pink-400 to-purple-500" 
  },
  { 
    id: 2, 
    name: "Lucas", 
    avatar: "", 
    cardNumber: "7834",
    status: "frozen",
    balance: 32,
    color: "from-blue-400 to-cyan-500" 
  },
  { 
    id: 3, 
    name: "Olivia", 
    avatar: "", 
    cardNumber: "2156",
    status: "pending",
    balance: 0,
    color: "from-amber-400 to-orange-500" 
  },
]

const defaultCategories: CategoryLimit[] = [
  { id: "food", name: "Food", icon: <Utensils className="w-4 h-4" />, enabled: true, dailyLimit: 20 },
  { id: "transport", name: "Transport", icon: <Bus className="w-4 h-4" />, enabled: true, dailyLimit: 10 },
  { id: "school", name: "School", icon: <GraduationCap className="w-4 h-4" />, enabled: true, dailyLimit: 25 },
  { id: "entertainment", name: "Entertainment", icon: <Tv className="w-4 h-4" />, enabled: true, dailyLimit: 15 },
  { id: "gaming", name: "Gaming", icon: <Gamepad2 className="w-4 h-4" />, enabled: false, dailyLimit: 0 },
  { id: "other", name: "Other", icon: <MoreHorizontal className="w-4 h-4" />, enabled: true, dailyLimit: 10 },
]

function makeDefaultLimits(): CardLimits {
  const base = defaultChildCardLimits()
  return {
    dailyCap: base.dailyCap,
    perTransactionCap: base.perTransactionCap,
    categories: defaultCategories.map((def) => {
      const saved = base.categories.find((c) => c.id === def.id)
      return saved ? { ...def, enabled: saved.enabled, dailyLimit: saved.dailyLimit } : { ...def }
    }),
    schoolDaysOnly: base.schoolDaysOnly,
    approvalThreshold: base.approvalThreshold,
  }
}

function toCardLimits(stored: ChildCardLimits): CardLimits {
  return {
    dailyCap: stored.dailyCap,
    perTransactionCap: stored.perTransactionCap,
    categories: defaultCategories.map((def) => {
      const saved = stored.categories.find((c) => c.id === def.id)
      return saved ? { ...def, enabled: saved.enabled, dailyLimit: saved.dailyLimit } : { ...def }
    }),
    schoolDaysOnly: stored.schoolDaysOnly,
    approvalThreshold: stored.approvalThreshold,
  }
}

function fromCardLimits(limits: CardLimits): ChildCardLimits {
  return {
    dailyCap: limits.dailyCap,
    perTransactionCap: limits.perTransactionCap,
    categories: limits.categories.map(({ id, enabled, dailyLimit }) => ({
      id,
      enabled,
      dailyLimit,
    })),
    schoolDaysOnly: limits.schoolDaysOnly,
    approvalThreshold: limits.approvalThreshold,
  }
}

export function CardManagement({
  child,
  childDbId,
  hideTitle = false,
  initialPanel = "limits",
  onDeleteChild,
  onFreezeChange,
}: CardManagementProps = {}) {
  const initialCards = child ? [toChildCard(child)] : childCards
  const initialLimits = child
    ? { 1: makeDefaultLimits() }
    : {
        1: {
          dailyCap: 50,
          perTransactionCap: 15,
          categories: [...defaultCategories],
          schoolDaysOnly: true,
          approvalThreshold: 20,
        },
        2: {
          dailyCap: 30,
          perTransactionCap: 10,
          categories: [...defaultCategories],
          schoolDaysOnly: false,
          approvalThreshold: 15,
        },
        3: {
          dailyCap: 25,
          perTransactionCap: 10,
          categories: [...defaultCategories],
          schoolDaysOnly: true,
          approvalThreshold: 10,
        },
      }

  const [cards, setCards] = useState(initialCards)
  const [expandedCard, setExpandedCard] = useState<number | null>(child ? 1 : 1)
  const [activePanel, setActivePanel] = useState<"limits" | "statements" | null>(
    childDbId ? initialPanel : null
  )
  const [limits, setLimits] = useState<Record<number, CardLimits>>(initialLimits)
  const [statements, setStatements] = useState<StatementsData | null>(null)
  const [statementsLoading, setStatementsLoading] = useState(false)
  const [statementsError, setStatementsError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [limitsLoading, setLimitsLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [freezeLoading, setFreezeLoading] = useState(false)
  const [freezeMessage, setFreezeMessage] = useState<string | null>(null)

  const fetchLimits = useCallback(async () => {
    if (!childDbId) return
    setLimitsLoading(true)
    try {
      const res = await fetch(`/api/parent/children/${childDbId}/limits`)
      if (!res.ok) throw new Error("Failed to load limits")
      const data = (await res.json()) as ChildCardLimits
      setLimits({ 1: toCardLimits(data) })
    } catch {
      setSaveMessage("Could not load saved limits")
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setLimitsLoading(false)
    }
  }, [childDbId])

  const fetchStatements = useCallback(async () => {
    if (!childDbId) return
    setStatementsLoading(true)
    setStatementsError(null)
    try {
      const res = await fetch(`/api/parent/children/${childDbId}/statements`)
      if (!res.ok) throw new Error("Failed to load")
      setStatements(await res.json())
    } catch {
      setStatementsError("Could not load statements")
    } finally {
      setStatementsLoading(false)
    }
  }, [childDbId])

  useEffect(() => {
    if (childDbId && activePanel === "statements") {
      fetchStatements()
    }
  }, [childDbId, activePanel, fetchStatements])

  useEffect(() => {
    if (childDbId && activePanel === "limits") {
      fetchLimits()
    }
  }, [childDbId, activePanel, fetchLimits])

  useEffect(() => {
    if (!childDbId) return
    setActivePanel(initialPanel)
    setExpandedCard(1)
  }, [childDbId, initialPanel])

  const fetchFreezeStatus = useCallback(async () => {
    if (!childDbId) return
    try {
      const res = await fetch(`/api/parent/children/${childDbId}/freeze`)
      if (!res.ok) return
      const data = (await res.json()) as { frozen: boolean }
      setCards((prev) =>
        prev.map((card) => ({
          ...card,
          status: data.frozen ? ("frozen" as const) : ("active" as const),
        }))
      )
    } catch {
      // ignore
    }
  }, [childDbId])

  useEffect(() => {
    fetchFreezeStatus()
  }, [fetchFreezeStatus])

  useEffect(() => {
    if (!child) return
    const frozen = child.cardFrozen ?? child.status === "frozen"
    setCards((prev) =>
      prev.map((c) => ({
        ...c,
        status: frozen ? ("frozen" as const) : ("active" as const),
      }))
    )
  }, [child?.cardFrozen, child?.status, child?.id])

  const toggleFreeze = async (cardId: number) => {
    const card = cards.find((c) => c.id === cardId)
    if (!card || card.status === "pending") return

    const willFreeze = card.status !== "frozen"

    if (!childDbId) {
      setCards(
        cards.map((c) =>
          c.id === cardId
            ? { ...c, status: willFreeze ? ("frozen" as const) : ("active" as const) }
            : c
        )
      )
      return
    }

    setFreezeLoading(true)
    setFreezeMessage(null)
    try {
      await setParentCardFrozen(childDbId, willFreeze)
      setCards(
        cards.map((c) =>
          c.id === cardId
            ? { ...c, status: willFreeze ? ("frozen" as const) : ("active" as const) }
            : c
        )
      )
      setFreezeMessage(willFreeze ? "Card frozen" : "Card unfrozen")
      onFreezeChange?.(willFreeze)
    } catch (e) {
      setFreezeMessage(e instanceof Error ? e.message : "Failed to update card")
    } finally {
      setFreezeLoading(false)
      setTimeout(() => setFreezeMessage(null), 3000)
    }
  }

  const openLimits = (cardId: number) => {
    setActivePanel(activePanel === "limits" && expandedCard === cardId ? null : "limits")
    setExpandedCard(activePanel === "limits" && expandedCard === cardId ? null : cardId)
  }

  const openStatements = () => {
    setActivePanel(activePanel === "statements" ? null : "statements")
    setExpandedCard(1)
  }

  const handleDelete = async () => {
    if (!onDeleteChild) return
    setDeleteLoading(true)
    try {
      await onDeleteChild()
    } finally {
      setDeleteLoading(false)
      setDeleteConfirm(false)
    }
  }

  const updateDailyCap = (cardId: number, value: number[]) => {
    setLimits(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], dailyCap: value[0] }
    }))
  }

  const updatePerTransactionCap = (cardId: number, value: string) => {
    const numValue = parseInt(value) || 0
    setLimits(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], perTransactionCap: Math.min(100, Math.max(0, numValue)) }
    }))
  }

  const toggleCategory = (cardId: number, categoryId: string) => {
    setLimits(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        categories: prev[cardId].categories.map(cat =>
          cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat
        )
      }
    }))
  }

  const updateCategoryLimit = (cardId: number, categoryId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setLimits(prev => ({
      ...prev,
      [cardId]: {
        ...prev[cardId],
        categories: prev[cardId].categories.map(cat =>
          cat.id === categoryId ? { ...cat, dailyLimit: Math.min(100, Math.max(0, numValue)) } : cat
        )
      }
    }))
  }

  const toggleSchoolDays = (cardId: number) => {
    setLimits(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], schoolDaysOnly: !prev[cardId].schoolDaysOnly }
    }))
  }

  const updateApprovalThreshold = (cardId: number, value: string) => {
    const numValue = parseInt(value) || 0
    setLimits(prev => ({
      ...prev,
      [cardId]: { ...prev[cardId], approvalThreshold: Math.min(100, Math.max(0, numValue)) }
    }))
  }

  const handleSaveLimits = async (cardId: number) => {
    const cardLimits = limits[cardId]
    if (!cardLimits) return

    if (!childDbId) {
      setSaveMessage("Limits saved (demo mode)")
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setSaveLoading(true)
    setSaveMessage(null)
    try {
      const res = await fetch(`/api/parent/children/${childDbId}/limits`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fromCardLimits(cardLimits)),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Failed to save limits")
      }
      setSaveMessage("Limits saved!")
    } catch (e) {
      setSaveMessage(e instanceof Error ? e.message : "Failed to save limits")
    } finally {
      setSaveLoading(false)
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  const getStatusBadge = (status: ChildCard["status"]) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
      case "frozen":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Frozen</Badge>
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending delivery</Badge>
    }
  }

  return (
    <section>
      {!hideTitle && (
        <h2 className="text-lg font-bold text-slate-900 mb-4">Card Management</h2>
      )}

      <div className="space-y-4">
        {cards.map((card) => {
          const cardLimits = limits[card.id]
          const isLimitsOpen = expandedCard === card.id && activePanel === "limits"
          const isStatementsOpen = expandedCard === card.id && activePanel === "statements"
          
          return (
            <Card key={card.id} className="border-slate-200 overflow-hidden bg-white text-slate-900">
              {/* Card Header */}
              <div className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12 ring-2 ring-white shadow-lg">
                    <AvatarImage src={card.avatar} alt={card.name} />
                    <AvatarFallback className={`bg-gradient-to-br ${card.color} text-white font-bold text-lg`}>
                      {card.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-900">{card.name}</h3>
                      {getStatusBadge(card.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="font-mono">{cardDisplayNumber(card.cardNumber)}</span>
                      <span className="font-medium text-slate-700">{card.balance} PC</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4">
                  <Button
                    variant={card.status === "frozen" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleFreeze(card.id)}
                    disabled={card.status === "pending" || freezeLoading}
                    className={card.status === "frozen" 
                      ? "bg-blue-600 hover:bg-blue-700 text-white" 
                      : "border-slate-300 text-slate-700 hover:bg-slate-50"
                    }
                  >
                    {card.status === "frozen" ? (
                      <>
                        <Play className="w-4 h-4 mr-1.5" />
                        Unfreeze
                      </>
                    ) : (
                      <>
                        <Snowflake className="w-4 h-4 mr-1.5" />
                        Freeze
                      </>
                    )}
                  </Button>
                  {freezeMessage && childDbId && (
                    <p className="text-xs text-slate-500 mt-1">{freezeMessage}</p>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openLimits(card.id)}
                    disabled={card.status === "pending"}
                    className={`border-slate-300 text-slate-700 hover:bg-slate-50 ${
                      isLimitsOpen ? "bg-slate-100" : ""
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                    Set Limits
                    {isLimitsOpen ? (
                      <ChevronUp className="w-4 h-4 ml-1.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1.5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openStatements}
                    disabled={card.status === "pending" || !childDbId}
                    className={`border-slate-300 text-slate-700 hover:bg-slate-50 ${
                      isStatementsOpen ? "bg-slate-100" : ""
                    }`}
                  >
                    <FileText className="w-4 h-4 mr-1.5" />
                    Statements
                    {isStatementsOpen ? (
                      <ChevronUp className="w-4 h-4 ml-1.5" />
                    ) : (
                      <ChevronDown className="w-4 h-4 ml-1.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded Limits Panel */}
              {isLimitsOpen && cardLimits && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-6">
                  {limitsLoading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading saved limits…
                    </div>
                  )}
                  {/* Daily Spending Cap Slider */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium text-slate-700">
                        Daily Spending Cap
                      </label>
                      <span className="text-sm font-semibold text-slate-900">
                        {cardLimits.dailyCap} PiggyCoins
                      </span>
                    </div>
                    <Slider
                      value={[cardLimits.dailyCap]}
                      onValueChange={(value) => updateDailyCap(card.id, value)}
                      max={100}
                      min={0}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>0 PC</span>
                      <span>100 PC</span>
                    </div>
                  </div>

                  {/* Per-Transaction Cap */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Per-Transaction Cap
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={cardLimits.perTransactionCap}
                        onChange={(e) => updatePerTransactionCap(card.id, e.target.value)}
                        className="w-24 bg-white"
                        min={0}
                        max={100}
                      />
                      <span className="text-sm text-slate-500">PiggyCoins per transaction</span>
                    </div>
                  </div>

                  {/* Category Toggles */}
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-3">
                      Category Limits
                    </label>
                    <div className="space-y-3">
                      {cardLimits.categories.map((category) => (
                        <div 
                          key={category.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            category.enabled 
                              ? "bg-white border-slate-200" 
                              : "bg-slate-100 border-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              category.enabled ? "bg-slate-100 text-slate-700" : "bg-slate-200 text-slate-400"
                            }`}>
                              {category.icon}
                            </div>
                            <span className={`font-medium ${
                              category.enabled ? "text-slate-900" : "text-slate-400"
                            }`}>
                              {category.name}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            {category.enabled && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={category.dailyLimit}
                                  onChange={(e) => updateCategoryLimit(card.id, category.id, e.target.value)}
                                  className="w-16 h-8 text-sm bg-white"
                                  min={0}
                                  max={100}
                                />
                                <span className="text-xs text-slate-400">PC/day</span>
                              </div>
                            )}
                            <Switch
                              checked={category.enabled}
                              onCheckedChange={() => toggleCategory(card.id, category.id)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Time Lock Toggle */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">School Days Only</p>
                        <p className="text-xs text-slate-500">Active Mon-Fri, 7am - 6pm</p>
                      </div>
                    </div>
                    <Switch
                      checked={cardLimits.schoolDaysOnly}
                      onCheckedChange={() => toggleSchoolDays(card.id)}
                    />
                  </div>

                  {/* Approval Threshold */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4 text-amber-600" />
                      </div>
                      <p className="font-medium text-slate-900">Require My Approval</p>
                    </div>
                    <div className="flex items-center gap-2 ml-11">
                      <span className="text-sm text-slate-600">For purchases over</span>
                      <Input
                        type="number"
                        value={cardLimits.approvalThreshold}
                        onChange={(e) => updateApprovalThreshold(card.id, e.target.value)}
                        className="w-20 h-8 text-sm bg-white"
                        min={0}
                        max={100}
                      />
                      <span className="text-sm text-slate-600">PiggyCoins</span>
                    </div>
                  </div>

                  {/* Save Button */}
                  <Button
                    type="button"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                    onClick={() => handleSaveLimits(card.id)}
                    disabled={saveLoading || limitsLoading}
                  >
                    {saveLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  {saveMessage && (
                    <p
                      className={cn(
                        "text-sm text-center",
                        saveMessage.toLowerCase().includes("saved") && !saveMessage.toLowerCase().includes("could not")
                          ? "text-emerald-600"
                          : "text-red-600"
                      )}
                    >
                      {saveMessage}
                    </p>
                  )}
                </div>
              )}

              {isStatementsOpen && (
                <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Statements & investments</h4>
                  {statementsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : statementsError ? (
                    <p className="text-sm text-red-600">{statementsError}</p>
                  ) : statements ? (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500">Wallet balance</p>
                          <p className="text-lg font-bold text-slate-900">{statements.balance} PC</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500">Portfolio value</p>
                          <p className="text-lg font-bold text-slate-900">{statements.portfolioValue} PC</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500">Total invested</p>
                          <p className="text-lg font-bold text-slate-900">{statements.totalInvested} PC</p>
                        </div>
                        <div className="p-3 rounded-lg bg-white border border-slate-200">
                          <p className="text-xs text-slate-500">Profit / loss</p>
                          <p
                            className={cn(
                              "text-lg font-bold flex items-center gap-1",
                              statements.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"
                            )}
                          >
                            {statements.profitLoss >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {statements.profitLoss >= 0 ? "+" : ""}
                            {statements.profitLoss} PC
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Lessons completed: {statements.lessonsCompleted}
                      </p>
                      {statements.portfolio.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Holdings</p>
                          <div className="space-y-2">
                            {statements.portfolio.map((h) => (
                              <div
                                key={h.companyName}
                                className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{h.icon}</span>
                                  <div>
                                    <p className="font-medium text-slate-900 text-sm">{h.companyName}</p>
                                    <p className="text-xs text-slate-500">{h.shares} shares</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 text-sm">{h.value} PC</p>
                                  <p
                                    className={cn(
                                      "text-xs",
                                      h.profitLoss >= 0 ? "text-emerald-600" : "text-red-600"
                                    )}
                                  >
                                    {h.profitLoss >= 0 ? "+" : ""}
                                    {h.profitLoss} PC
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {statements.transactions.length > 0 && (
                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Recent transactions</p>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {statements.transactions.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200"
                              >
                                <div>
                                  <p className="font-medium text-slate-900 text-sm">{tx.merchant}</p>
                                  <p className="text-xs text-slate-500">{tx.time}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-slate-900 text-sm">{tx.amount} PC</p>
                                  <Badge
                                    className={
                                      tx.status === "approved"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-700"
                                    }
                                  >
                                    {tx.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {statements.portfolio.length === 0 && statements.transactions.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">No activity yet</p>
                      )}
                    </>
                  ) : null}
                </div>
              )}

              {childDbId && onDeleteChild && (
                <div className="border-t border-slate-200 p-4">
                  {!deleteConfirm ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirm(true)}
                      className="w-full border-red-200 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Delete child profile
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-600 text-center">
                        Remove {card.name}? This deletes their wallet, investments, and history.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDeleteConfirm(false)}
                          disabled={deleteLoading}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={handleDelete}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Delete"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </section>
  )
}
