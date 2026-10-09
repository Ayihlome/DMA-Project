/** Profile analytics shared by the web and mobile apps (on screen and in the PDF report). */
import type { AppState } from './types'
import { CATEGORIES } from './types'
import { DAY, TARGET_DAYS, daysCover, healthOf, stockItems } from './inventory'

export type Analytics = {
  total: number
  healthy: number
  low: number
  critical: number
  percent: number
  categories: { name: string; icon: string; level: number }[]
  weeks: string[]
  sold: number[]
  restocked: number[]
}

export function analyticsOf(state: AppState, now = Date.now()): Analytics {
  const items = stockItems(state)
  const health = items.map((p) => healthOf(state, p, now))
  const healthy = health.filter((h) => h === 'healthy').length
  const low = health.filter((h) => h === 'low').length
  const critical = health.filter((h) => h === 'critical' || h === 'out').length

  const categories = CATEGORIES.map((c) => {
    const ps = state.products.filter((p) => p.category === c.key && healthOf(state, p, now) !== 'setup')
    if (!ps.length) return null
    const level = Math.round((ps.reduce((t, p) => t + Math.min(1, daysCover(state, p, now) / TARGET_DAYS), 0) / ps.length) * 100)
    return { name: c.label, icon: c.icon, level }
  })
    .filter((x): x is { name: string; icon: string; level: number } => !!x)
    .sort((a, b) => b.level - a.level)

  const weekStart = new Date(now).setHours(0, 0, 0, 0) - 83 * DAY
  const sold = Array(12).fill(0) as number[]
  const restocked = Array(12).fill(0) as number[]
  for (const s of state.sales) {
    const w = Math.floor((s.at - weekStart) / (7 * DAY))
    if (w >= 0 && w < 12) sold[w] += s.lines.reduce((t, l) => t + l.qty, 0)
  }
  for (const p of state.purchases) {
    if (p.status !== 'delivered' || !p.receivedAt) continue
    const w = Math.floor((p.receivedAt - weekStart) / (7 * DAY))
    if (w >= 0 && w < 12) restocked[w] += Math.round(p.lines.reduce((t, l) => t + l.qty, 0))
  }
  const weeks = sold.map((_, i) => new Date(weekStart + i * 7 * DAY).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }))
  return {
    total: items.length,
    healthy,
    low,
    critical,
    percent: Math.round((healthy / Math.max(items.length, 1)) * 100),
    categories,
    weeks,
    sold,
    restocked,
  }
}
