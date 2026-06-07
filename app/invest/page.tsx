"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RefreshCw, TrendingUp, TrendingDown, Zap, Trophy, BookOpen, Clock, Target, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface MarketPrice {
  id: string
  name: string
  icon: string | null
  currentPrice: number
  change24h: number
  history7d: Array<{ price: number; date: string }>
}

interface MarketNews {
  id: number
  companyId: string
  companyName: string
  companyIcon: string | null
  headline: string
  changePercent: number
  isPositive: boolean
  createdAt: string
}

interface Challenge {
  id: string
  title: string
  description: string
  icon: string | null
  xpReward: number
  currentProgress: number
  targetValue: number
  progressPercent: number
  isCompleted: boolean
  completedAt: string | null
}

interface Wallet {
  xpBalance: number
  trustyScore: number
}

const DEMO_CHILD_ID = "demo-child-1"

export default function InvestPage() {
  const [prices, setPrices] = useState<MarketPrice[]>([])
  const [news, setNews] = useState<MarketNews[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [loading, setLoading] = useState({
    prices: false,
    simulate: false,
    challenges: false,
    checkBuy: false,
    checkSell: false,
    checkLesson: false,
    checkDaily: false,
  })
  const [lastSimulation, setLastSimulation] = useState<{
    updates: Array<{ company: string; oldPrice: number; newPrice: number; changePercent: number }>
    newsGenerated: Array<{ company: string; headline: string }>
  } | null>(null)

  const fetchPrices = async () => {
    setLoading(l => ({ ...l, prices: true }))
    try {
      const res = await fetch("/api/market/prices")
      const data = await res.json()
      if (data.success) {
        setPrices(data.prices)
        setNews(data.recentNews)
      }
    } catch (error) {
      console.error("Failed to fetch prices:", error)
    } finally {
      setLoading(l => ({ ...l, prices: false }))
    }
  }

  const runSimulation = async () => {
    setLoading(l => ({ ...l, simulate: true }))
    try {
      const res = await fetch("/api/cron/market-simulation")
      const data = await res.json()
      if (data.success) {
        setLastSimulation({ updates: data.updates, newsGenerated: data.newsGenerated })
        // Refresh prices after simulation
        await fetchPrices()
      }
    } catch (error) {
      console.error("Failed to run simulation:", error)
    } finally {
      setLoading(l => ({ ...l, simulate: false }))
    }
  }

  const fetchChallenges = async () => {
    setLoading(l => ({ ...l, challenges: true }))
    try {
      const res = await fetch(`/api/challenges/${DEMO_CHILD_ID}`)
      const data = await res.json()
      if (data.success) {
        setChallenges(data.challenges)
        setWallet(data.wallet)
      }
    } catch (error) {
      console.error("Failed to fetch challenges:", error)
    } finally {
      setLoading(l => ({ ...l, challenges: false }))
    }
  }

  const checkChallengeProgress = async (eventType: string, loadingKey: keyof typeof loading) => {
    setLoading(l => ({ ...l, [loadingKey]: true }))
    try {
      const body: Record<string, unknown> = { childId: DEMO_CHILD_ID, eventType }
      
      // Add profit data for sell events (simulate a profit)
      if (eventType === "sell") {
        body.sellPrice = 55
        body.avgBuyPrice = 45
      }
      
      const res = await fetch("/api/challenges/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success && data.completedChallenges.length > 0) {
        alert(`Challenges completed: ${data.completedChallenges.map((c: { title: string }) => c.title).join(", ")}`)
      }
      // Refresh challenges
      await fetchChallenges()
    } catch (error) {
      console.error("Failed to check challenge:", error)
    } finally {
      setLoading(l => ({ ...l, [loadingKey]: false }))
    }
  }

  const getChallengeIcon = (challengeType: string) => {
    switch (challengeType) {
      case "buy-first-share": return <Target className="w-5 h-5" />
      case "diversify-portfolio": return <Sparkles className="w-5 h-5" />
      case "make-profit": return <TrendingUp className="w-5 h-5" />
      case "complete-lessons": return <BookOpen className="w-5 h-5" />
      case "hold-7-days": return <Clock className="w-5 h-5" />
      default: return <Trophy className="w-5 h-5" />
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">PiggyBank Investment Services</h1>
          <p className="text-muted-foreground">Demo for MarketSimulationService and InvestmentChallengeService</p>
        </header>

        <Tabs defaultValue="market" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="market">Market Simulation</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          <TabsContent value="market" className="space-y-6">
            {/* Market Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Market Controls</CardTitle>
                <CardDescription>
                  Fetch current prices or manually trigger the market simulation (runs every 6 hours in production)
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-4">
                <Button onClick={fetchPrices} disabled={loading.prices}>
                  {loading.prices ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Fetch Prices
                </Button>
                <Button onClick={runSimulation} disabled={loading.simulate} variant="secondary">
                  {loading.simulate ? <Zap className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                  Run Simulation
                </Button>
              </CardContent>
            </Card>

            {/* Last Simulation Results */}
            {lastSimulation && (
              <Card>
                <CardHeader>
                  <CardTitle>Last Simulation Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    {lastSimulation.updates.map((update, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <span className="font-medium">{update.company}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-muted-foreground">
                            ${update.oldPrice.toFixed(2)} → ${update.newPrice.toFixed(2)}
                          </span>
                          <Badge variant={update.changePercent >= 0 ? "default" : "destructive"}>
                            {update.changePercent >= 0 ? "+" : ""}{update.changePercent.toFixed(2)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  {lastSimulation.newsGenerated.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">News Generated:</p>
                      {lastSimulation.newsGenerated.map((n, i) => (
                        <p key={i} className="text-sm text-muted-foreground">{n.headline}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Prices */}
            {prices.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Market Prices</CardTitle>
                  <CardDescription>GET /api/market/prices</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {prices.map(stock => (
                      <div key={stock.id} className="p-4 border rounded-xl space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{stock.icon}</span>
                            <span className="font-semibold">{stock.name}</span>
                          </div>
                          <span className="text-xl font-bold">${stock.currentPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {stock.change24h >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-rose-500" />
                          )}
                          <span className={cn(
                            "text-sm font-medium",
                            stock.change24h >= 0 ? "text-emerald-500" : "text-rose-500"
                          )}>
                            {stock.change24h >= 0 ? "+" : ""}{stock.change24h.toFixed(2)}% (24h)
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {stock.history7d.length} data points in 7-day history
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Market News */}
            {news.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Market News</CardTitle>
                  <CardDescription>Investment news when share prices move sharply (simulated market)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {news.map(item => (
                      <div key={item.id} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                        <span className="text-xl">{item.companyIcon}</span>
                        <div className="flex-1">
                          <p className="font-medium">{item.headline}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={item.isPositive ? "default" : "destructive"}>
                          {item.isPositive ? "+" : ""}{item.changePercent.toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="challenges" className="space-y-6">
            {/* Wallet Info */}
            {wallet && (
              <Card>
                <CardHeader>
                  <CardTitle>Wallet</CardTitle>
                  <CardDescription>Child ID: {DEMO_CHILD_ID}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-8">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Zap className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{wallet.xpBalance}</p>
                        <p className="text-sm text-muted-foreground">XP Balance</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{wallet.trustyScore}</p>
                        <p className="text-sm text-muted-foreground">Trusty Score</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Challenge Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Challenge Controls</CardTitle>
                <CardDescription>
                  Test the checkChallengeProgress function with different event types
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={fetchChallenges} disabled={loading.challenges}>
                  {loading.challenges ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Fetch Challenges
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => checkChallengeProgress("buy", "checkBuy")}
                    disabled={loading.checkBuy}
                  >
                    {loading.checkBuy && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Simulate Buy
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => checkChallengeProgress("sell", "checkSell")}
                    disabled={loading.checkSell}
                  >
                    {loading.checkSell && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Simulate Sell (with profit)
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => checkChallengeProgress("lesson_quiz", "checkLesson")}
                    disabled={loading.checkLesson}
                  >
                    {loading.checkLesson && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Simulate Quiz Pass
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => checkChallengeProgress("daily_check", "checkDaily")}
                    disabled={loading.checkDaily}
                  >
                    {loading.checkDaily && <RefreshCw className="w-4 h-4 mr-2 animate-spin" />}
                    Daily Check
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Challenges List */}
            {challenges.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Challenges</CardTitle>
                  <CardDescription>GET /api/challenges/{"{childId}"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {challenges.map(challenge => (
                      <div 
                        key={challenge.id} 
                        className={cn(
                          "p-4 border rounded-xl space-y-3",
                          challenge.isCompleted && "bg-emerald-50 border-emerald-200"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              challenge.isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-muted text-muted-foreground"
                            )}>
                              {challenge.icon ? (
                                <span className="text-xl">{challenge.icon}</span>
                              ) : (
                                getChallengeIcon(challenge.id)
                              )}
                            </div>
                            <div>
                              <p className="font-semibold">{challenge.title}</p>
                              <p className="text-sm text-muted-foreground">{challenge.description}</p>
                            </div>
                          </div>
                          <Badge variant={challenge.isCompleted ? "default" : "secondary"}>
                            {challenge.xpReward} XP
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{challenge.currentProgress} / {challenge.targetValue}</span>
                          </div>
                          <Progress value={challenge.progressPercent} className="h-2" />
                        </div>
                        {challenge.isCompleted && challenge.completedAt && (
                          <p className="text-xs text-emerald-600">
                            Completed on {new Date(challenge.completedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
