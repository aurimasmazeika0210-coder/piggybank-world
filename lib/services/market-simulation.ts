import { sql, MARKET_CONFIG, type Company } from "@/lib/db"
import { pickInvestmentHeadline } from "@/lib/market-news"

function calculateNewPrice(currentPrice: number, startingPrice: number): { newPrice: number; changePercent: number } {
  const minChange = MARKET_CONFIG.MIN_CHANGE_PERCENT
  const maxChange = MARKET_CONFIG.MAX_CHANGE_PERCENT
  
  // Random walk: generate a random percentage change
  const changePercent = minChange + Math.random() * (maxChange - minChange)
  
  // Calculate new price
  let newPrice = currentPrice * (1 + changePercent / 100)
  
  // Enforce minimum price (50% of starting price)
  const minPrice = startingPrice * MARKET_CONFIG.MIN_PRICE_RATIO
  newPrice = Math.max(newPrice, minPrice)
  
  // Round to 2 decimal places
  newPrice = Math.round(newPrice * 100) / 100
  
  // Recalculate actual change percent after min price enforcement
  const actualChangePercent = ((newPrice - currentPrice) / currentPrice) * 100
  
  return {
    newPrice,
    changePercent: Math.round(actualChangePercent * 100) / 100,
  }
}

export async function simulateMarketPrices(): Promise<{
  updates: Array<{ company: string; oldPrice: number; newPrice: number; changePercent: number }>
  newsGenerated: Array<{ company: string; headline: string }>
}> {
  // Get all companies
  const companies = await sql`
    SELECT id, name, starting_price, current_price, icon 
    FROM companies
  ` as Company[]
  
  const updates: Array<{ company: string; oldPrice: number; newPrice: number; changePercent: number }> = []
  const newsGenerated: Array<{ company: string; headline: string }> = []
  
  for (const company of companies) {
    const { newPrice, changePercent } = calculateNewPrice(
      Number(company.current_price),
      Number(company.starting_price)
    )
    
    // Update company current price
    await sql`
      UPDATE companies 
      SET current_price = ${newPrice}, updated_at = NOW()
      WHERE id = ${company.id}
    `
    
    // Record in price history
    await sql`
      INSERT INTO stock_price_history (company_id, price, change_percent)
      VALUES (${company.id}, ${newPrice}, ${changePercent})
    `
    
    updates.push({
      company: company.name,
      oldPrice: Number(company.current_price),
      newPrice,
      changePercent,
    })
    
    // Generate news if price moved more than threshold
    if (Math.abs(changePercent) >= MARKET_CONFIG.NEWS_THRESHOLD_PERCENT) {
      const { headline, isPositive } = pickInvestmentHeadline(company.name, changePercent)
      
      await sql`
        INSERT INTO market_news (company_id, headline, change_percent, is_positive)
        VALUES (${company.id}, ${headline}, ${changePercent}, ${isPositive})
      `
      
      newsGenerated.push({
        company: company.name,
        headline,
      })
    }
  }
  
  return { updates, newsGenerated }
}

export interface MarketPriceResponse {
  id: string
  name: string
  icon: string | null
  currentPrice: number
  change24h: number
  history7d: Array<{ price: number; date: string }>
}

export async function getMarketPrices(): Promise<MarketPriceResponse[]> {
  // Get all companies with current prices
  const companies = await sql`
    SELECT id, name, icon, current_price 
    FROM companies
    ORDER BY name
  ` as Company[]
  
  const result: MarketPriceResponse[] = []
  
  for (const company of companies) {
    // Get price from 24 hours ago (or earliest if less history)
    const price24hAgo = await sql`
      SELECT price FROM stock_price_history
      WHERE company_id = ${company.id} 
        AND recorded_at <= NOW() - INTERVAL '24 hours'
      ORDER BY recorded_at DESC
      LIMIT 1
    ` as Array<{ price: number }>
    
    // Calculate 24h change
    const oldPrice = price24hAgo[0]?.price ?? company.current_price
    const change24h = ((Number(company.current_price) - Number(oldPrice)) / Number(oldPrice)) * 100
    
    // Get 7-day price history
    const history = await sql`
      SELECT price, recorded_at as date
      FROM stock_price_history
      WHERE company_id = ${company.id}
        AND recorded_at >= NOW() - INTERVAL '7 days'
      ORDER BY recorded_at ASC
    ` as Array<{ price: number; date: string }>
    
    result.push({
      id: company.id,
      name: company.name,
      icon: company.icon,
      currentPrice: Number(company.current_price),
      change24h: Math.round(change24h * 100) / 100,
      history7d: history.map(h => ({
        price: Number(h.price),
        date: new Date(h.date).toISOString(),
      })),
    })
  }
  
  return result
}

export async function getMarketNews(limit: number = 10): Promise<Array<{
  id: number
  companyId: string
  companyName: string
  companyIcon: string | null
  headline: string
  changePercent: number
  isPositive: boolean
  createdAt: string
}>> {
  const news = await sql`
    SELECT mn.id, mn.company_id, c.name as company_name, c.icon as company_icon,
           mn.headline, mn.change_percent, mn.is_positive, mn.created_at
    FROM market_news mn
    JOIN companies c ON c.id = mn.company_id
    ORDER BY mn.created_at DESC
    LIMIT ${limit}
  ` as Array<{
    id: number
    company_id: string
    company_name: string
    company_icon: string | null
    headline: string
    change_percent: number
    is_positive: boolean
    created_at: string
  }>
  
  return news.map(n => ({
    id: n.id,
    companyId: n.company_id,
    companyName: n.company_name,
    companyIcon: n.company_icon,
    headline: n.headline,
    changePercent: Number(n.change_percent),
    isPositive: n.is_positive,
    createdAt: new Date(n.created_at).toISOString(),
  }))
}
