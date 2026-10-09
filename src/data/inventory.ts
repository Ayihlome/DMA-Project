import type { AppState, Product, SupplierPrice } from './types'
import { qty as fmtQty, rand } from '../lib/format'

export const DAY = 86_400_000
/** BR3 thresholds (days of stock left). */
export const CRITICAL_DAYS = 1
export const LOW_DAYS = 4
/** Restock plans aim to cover this many days of usage. */
export const TARGET_DAYS = 7
const USAGE_WINDOW_DAYS = 7

export type Health = 'setup' | 'out' | 'critical' | 'low' | 'healthy'

export const productById = (s: AppState, id: string) => s.products.find((p) => p.id === id)
export const stockItems = (s: AppState) => s.products.filter((p) => !p.composite)

/** Quantity with unit, showing small kg amounts in grams ("50 g"). */
export function unitQty(p: Product, n: number) {
  if (p.unit === 'kg' && n < 1) return `${Math.round(n * 1000)} g`
  return `${fmtQty(n)} ${n === 1 ? p.unit : p.unitPlural}`
}

/** BR1: deduction = sold quantity x quantity required, per recipe component. */
export function deductionsFor(s: AppState, lines: { productId: string; qty: number }[]) {
  const out = new Map<string, number>()
  for (const l of lines) {
    const p = productById(s, l.productId)
    if (!p) continue
    if (p.composite) {
      for (const r of p.recipe ?? []) out.set(r.productId, (out.get(r.productId) ?? 0) + r.qty * l.qty)
    } else {
      out.set(p.id, (out.get(p.id) ?? 0) + l.qty)
    }
  }
  return out
}

/** How many of a product can be sold right now (composites are limited by their scarcest ingredient). */
export function available(s: AppState, p: Product): number {
  if (!p.composite) return p.stock
  if (!p.recipe?.length) return 0
  return Math.min(
    ...p.recipe.map((r) => {
      const c = productById(s, r.productId)
      return c ? Math.floor(c.stock / r.qty + 1e-9) : 0
    }),
  )
}

/** Average daily usage over the last week, including ingredient usage from composite sales. */
export function dailyUsage(s: AppState, productId: string, now = Date.now()) {
  const since = now - USAGE_WINDOW_DAYS * DAY
  let used = 0
  for (const sale of s.sales) {
    if (sale.at < since) continue
    for (const [id, n] of deductionsFor(s, sale.lines)) if (id === productId) used += n
    for (const l of sale.lines) if (l.productId === productId && productById(s, productId)?.composite) used += l.qty
  }
  return used / USAGE_WINDOW_DAYS
}

export function daysCover(s: AppState, p: Product, now = Date.now()) {
  const use = dailyUsage(s, p.id, now)
  return use > 0 ? available(s, p) / use : Infinity
}

export function healthOf(s: AppState, p: Product, now = Date.now()): Health {
  if (p.composite && !p.recipe?.length) return 'setup'
  if (available(s, p) <= 0) return 'out'
  const cover = daysCover(s, p, now)
  if (cover < CRITICAL_DAYS) return 'critical'
  if (cover < LOW_DAYS) return 'low'
  return 'healthy'
}

export const needsAction = (h: Health) => h !== 'healthy'

export function coverLabel(s: AppState, p: Product, now = Date.now()) {
  if (p.composite && !p.recipe?.length) return 'Recipe missing'
  if (available(s, p) <= 0) return 'None left'
  const c = daysCover(s, p, now)
  if (!Number.isFinite(c)) return 'No recent sales'
  if (c < 1) return `About ${Math.max(1, Math.round(c * 24))} h left`
  return `About ${Math.round(c)} ${Math.round(c) === 1 ? 'day' : 'days'} left`
}

export function pricesFor(s: AppState, productId: string): SupplierPrice[] {
  return s.prices.filter((x) => x.productId === productId).sort((a, b) => a.unitPrice - b.unitPrice)
}

export const supplierName = (s: AppState, id: string) => s.suppliers.find((x) => x.id === id)?.name ?? 'Unknown supplier'

export function salesSince(s: AppState, since: number) {
  return s.sales.filter((x) => x.at >= since)
}

export function startOfToday(now = Date.now()) {
  return new Date(now).setHours(0, 0, 0, 0)
}

export function dashboardKpis(s: AppState, now = Date.now()) {
  const today = salesSince(s, startOfToday(now))
  const yesterdayStart = startOfToday(now) - DAY
  const yesterdaySameTime = s.sales.filter((x) => x.at >= yesterdayStart && x.at < now - DAY)
  const salesToday = today.reduce((t, x) => t + x.total, 0)
  const salesYesterday = yesterdaySameTime.reduce((t, x) => t + x.total, 0)
  const items = stockItems(s)
  const attention = items.filter((p) => needsAction(healthOf(s, p, now)))
  const critical = attention.filter((p) => ['out', 'critical'].includes(healthOf(s, p, now)))
  const stockValue = items.reduce((t, p) => t + p.stock * p.cost, 0)
  const soonest = Math.min(...items.map((p) => daysCover(s, p, now)))
  return { salesToday, salesYesterday, salesCount: today.length, attention, critical, stockValue, itemCount: items.length, soonest }
}

export type Recommendation = {
  product: Product
  health: Health
  qty: number
  supplierId: string
  unitPrice: number
  cost: number
  usage: number
  cover: number
  reasons: string[]
  options: { supplierId: string; unitPrice: number; delta: number }[]
}

/** FR6/FR9: rules-based, explainable restock suggestions for every stock item that needs action. */
export function recommendations(s: AppState, now = Date.now()): Recommendation[] {
  return stockItems(s)
    .map((p) => ({ p, h: healthOf(s, p, now) }))
    .filter(({ h }) => needsAction(h))
    .map(({ p, h }) => {
      const usage = dailyUsage(s, p.id, now)
      const cover = daysCover(s, p, now)
      const options = pricesFor(s, p.id)
      const cheapest = options[0]
      const chosen = options.find((o) => o.supplierId === s.preferred[p.id]) ?? cheapest
      const need = Math.max(p.packSize, TARGET_DAYS * usage - p.stock)
      const packs = Math.ceil(need / p.packSize - 1e-9)
      const qty = Math.max(chosen?.minOrder ?? 0, Math.round(packs * p.packSize * 100) / 100)
      const unitPrice = chosen?.unitPrice ?? p.cost
      const reasons = [
        `${unitQty(p, p.stock)} left, ${Number.isFinite(cover) ? `about ${cover < 1 ? `${Math.max(1, Math.round(cover * 24))} hours` : `${Math.round(cover)} days`} of stock` : 'no recent usage'}.`,
        `Uses about ${unitQty(p, Math.round(usage * 10) / 10)} a day (last 7 days).`,
        `Suggested ${unitQty(p, qty)} covers about ${TARGET_DAYS} days.`,
        cheapest && chosen
          ? chosen.supplierId === cheapest.supplierId
            ? `${supplierName(s, chosen.supplierId)} is the cheapest saved price (${rand(chosen.unitPrice)} per ${p.unit}).`
            : `${supplierName(s, chosen.supplierId)} chosen by you; ${rand(chosen.unitPrice - cheapest.unitPrice)} per ${p.unit} more than the cheapest.`
          : 'No supplier price saved yet; estimated from average cost.',
      ]
      return {
        product: p,
        health: h,
        qty,
        supplierId: chosen?.supplierId ?? '',
        unitPrice,
        cost: Math.round(qty * unitPrice * 100) / 100,
        usage,
        cover,
        reasons,
        options: options.map((o) => ({
          supplierId: o.supplierId,
          unitPrice: o.unitPrice,
          delta: o.unitPrice - (cheapest?.unitPrice ?? o.unitPrice),
        })),
      }
    })
    .sort((a, b) => a.cover - b.cover || b.usage - a.usage)
}

export const purchaseTotal = (p: { lines: { qty: number; unitPrice: number }[] }) => p.lines.reduce((t, l) => t + l.qty * l.unitPrice, 0)
