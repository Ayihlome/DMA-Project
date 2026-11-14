/**
 * What Home shows, worked out from the shop state with no React in it.
 */
import { dashboardKpis, healthOf, stockItems, stockUncounted, type Health } from '../../data/inventory'
import type { AppState } from '../../data/types'
import { money } from '../../theme/tokens'
import { shortName } from '../Sell/sellModel'
import { weekProfit } from '../Profit/profitModel'

/** Worst first: what's already gone, then what's about to go. */
const SEVERITY: Record<Health, number> = { out: 0, critical: 1, low: 2, setup: 3, healthy: 4 }
const NAMED = 3

export type HomeSummary = {
  total: number
  count: number
  /** Nothing counted yet: low-stock warnings would all be noise. */
  uncounted: boolean
  lowCount: number
  /** Out, or gone within a day. The rest of `lowCount` is medium. */
  criticalCount: number
  /** "2 critical · 3 medium · Coke can, Albany bread, Polony…" */
  lowNames: string
  /**
   * Items Count stock will put under "Check these first": sold past zero, or
   * sold with no recipe. Sales are never refused for stock, so this is where
   * the owner hears about it.
   */
  toCheck: number
  /**
   * Today against yesterday up to the same time of day — 10am against 10am,
   * not against all of yesterday, which would make every morning look bad.
   * Null when there's nothing to compare.
   */
  vsYesterday: string | null
}

export function homeSummary(s: AppState, now = Date.now()): HomeSummary {
  const k = dashboardKpis(s, now)
  const low = [...k.attention].sort((a, b) => SEVERITY[healthOf(s, a, now)] - SEVERITY[healthOf(s, b, now)])
  const names = low.slice(0, NAMED).map((p) => shortName(p, p.price))
  const critical = k.critical.length
  const medium = low.length - critical
  const levels = [critical ? `${critical} critical` : '', medium ? `${medium} medium` : ''].filter(Boolean).join(' · ')
  const oversold = stockItems(s).filter((p) => p.stock < 0).length
  const unrecipied = s.products.filter((p) => p.composite && (p.soldWithoutRecipe ?? 0) > 0).length

  return {
    total: Math.round(k.salesToday * 100) / 100,
    count: k.salesCount,
    uncounted: stockUncounted(s),
    lowCount: low.length,
    criticalCount: critical,
    lowNames: `${levels} · ${names.join(', ')}${low.length > NAMED ? '…' : ''}`,
    toCheck: oversold + unrecipied,
    vsYesterday: compare(k.salesToday, k.salesYesterday),
  }
}

/** "▲ R120,00 more than this time yesterday". Arrow and words both say it, not colour alone. */
export function compare(today: number, yesterday: number): string | null {
  if (today === 0 && yesterday === 0) return null
  const diff = Math.round((today - yesterday) * 100) / 100
  if (diff === 0) return 'Same as this time yesterday'
  return diff > 0
    ? `▲ ${money(diff)} more than this time yesterday`
    : `▼ ${money(-diff)} less than this time yesterday`
}

export const salesLine = (count: number) =>
  count === 0 ? 'No sales yet today' : `${count} sale${count === 1 ? '' : 's'} so far`

/**
 * Home's profit row, or null while nothing sold this week has a known cost.
 * The share is rounded down and the items with no cost are named, so it never
 * reads as more complete than it is.
 */
export function profitRow(s: AppState, now = Date.now()): { title: string; detail: string } | null {
  const w = weekProfit(s, now)
  if (!w) return null
  const title = w.kept < 0 ? `Lost ${money(-w.kept)} this week` : `Kept ${money(w.kept)} this week`
  if (w.covered >= 0.995) return { title, detail: 'Every sale this week has a cost' }
  const missing = w.missing ? ` · ${w.missing} item${w.missing === 1 ? '' : 's'} with no cost yet` : ''
  return { title, detail: `Covers ${Math.floor(w.covered * 100)}% of takings${missing}` }
}
