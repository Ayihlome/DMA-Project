import type { LowStockItem } from './dashboardData'
import { categoryText, iconFor, round2 } from '../../shared/productPresentation'

const DAY = 86_400_000

/** What getDashboardSummary answers with (see the contract in useCases/getDashboardSummary.js). */
export type DashboardSummary = {
  salesToday: number
  salesYesterday: number
  itemCount: number
  stockValue: number
  restockCount: number
  soonestStockoutDays: number | null
  lowStock: {
    productID: string
    name: string
    category: string | null
    unit: string
    stockOnHand: number
    level: 'out-soon' | 'low'
  }[]
}

export function toLowStockItems(summary: DashboardSummary): LowStockItem[] {
  return summary.lowStock.map(i => ({
    id: i.productID,
    name: i.name,
    size: categoryText(i.category),
    left: round2(i.stockOnHand),
    unit: i.unit,
    level: i.level,
    icon: iconFor(i.category),
  }))
}

/** "Today", the weekday the soonest item runs out, or "Not needed". */
export function nextRestockLabel(soonestStockoutDays: number | null, now = Date.now()): string {
  if (soonestStockoutDays === null) return 'Not needed'
  if (soonestStockoutDays <= 1) return 'Today'
  return new Date(now + Math.floor(soonestStockoutDays) * DAY).toLocaleDateString('en-ZA', { weekday: 'long' })
}
