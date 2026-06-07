/** Investment-themed headlines for the simulated stock market. */

const POSITIVE_HEADLINES = [
  "{company} shares rise {pct}% — investors are buying more stock",
  "Strong demand lifts {company} share price for PiggyBank investors",
  "{company} stock is up {pct}%: good news for shareholders this week",
  "Analysts say {company} looks attractive — more kids are investing",
  "{company} earnings beat expectations; share price climbs",
  "Investors pile into {company} as the market turns bullish",
  "{company} dividend outlook improves — holders may earn more PC",
  "Portfolio tip: {company} shares gained {pct}% in this simulation",
]

const NEGATIVE_HEADLINES = [
  "{company} shares fall {pct}% — some investors are selling",
  "Profit-taking pulls {company} stock down {pct}% today",
  "{company} faces headwinds; cautious investors reduce holdings",
  "Share price dips at {company} amid broader market nerves",
  "{company} stock slides {pct}% — a reminder that prices can drop",
  "Fewer buyers for {company} shares; price moves lower",
  "Risk-off mood: {company} down {pct}% for shareholders",
  "Long-term investors may wait — {company} shares cooled {pct}%",
]

const STEADY_INSIGHTS = [
  "{company} shares are steady. Patient investors often hold through small moves.",
  "{company} is trading flat today — a calm day for your portfolio.",
  "No big swing in {company} stock yet. Diversifying across companies spreads risk.",
]

export function formatPct(changePercent: number): string {
  return Math.abs(changePercent).toFixed(1)
}

export function pickInvestmentHeadline(
  companyName: string,
  changePercent: number
): { headline: string; isPositive: boolean } {
  const isPositive = changePercent > 0
  const pct = formatPct(changePercent)
  const templates = isPositive ? POSITIVE_HEADLINES : NEGATIVE_HEADLINES
  const template = templates[Math.floor(Math.random() * templates.length)]
  const headline = template
    .replace(/\{company\}/g, companyName)
    .replace(/\{pct\}/g, pct)
  return { headline, isPositive }
}

/** "Why?" text on the Market tab — always investment-focused. */
export function buildInvestmentWhy(
  companyName: string,
  change24h: number,
  headline?: string
): string {
  if (headline?.trim()) {
    return `${headline.trim()} If you own ${companyName} shares, price moves change how much your investment is worth in PiggyCoins.`
  }

  const abs = Math.abs(change24h)
  const dir = change24h >= 0 ? "up" : "down"
  const sign = change24h >= 0 ? "+" : ""

  if (abs < 1.5) {
    const t = STEADY_INSIGHTS[Math.floor(Math.random() * STEADY_INSIGHTS.length)]
    return t.replace(/\{company\}/g, companyName)
  }

  if (change24h > 0) {
    return `${companyName} shares are ${dir} ${sign}${change24h.toFixed(1)}% today. When more people want to buy than sell, the share price usually rises — that can grow the value of your investment.`
  }

  return `${companyName} shares are ${dir} ${abs.toFixed(1)}% today. When investors sell, prices can fall — that's normal risk when you invest instead of only saving.`
}
