/**
 * The shopping list, worked out from the shop state with no React in it.
 */
import { dailyUsage, pricesFor, stockItems, stockUncounted, supplierName, unitQty } from '../../data/inventory'
import type { AppState, Product } from '../../data/types'

/**
 * When the shop restocks: weekly, on the day set in Profile (Thursday until the
 * owner picks one). 0 = Sunday … 6 = Saturday.
 */
export const RESTOCK_DAY = 4
export const RESTOCK_EVERY_DAYS = 7
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** The shop's shopping day. */
export const restockDayOf = (s: AppState) => s.restockDay ?? RESTOCK_DAY
export const restockDayName = (s: AppState) => DAY_NAMES[restockDayOf(s)]

/** Days from today to the next shopping day. Today counts as the shopping day. */
export function daysToShopping(now = Date.now(), day = RESTOCK_DAY) {
  return (day - new Date(now).getDay() + 7) % 7
}

export type RestockItem = {
  product: Product
  /** Packs to buy, rounded up. */
  packs: number
  /** Cheapest saved price per unit; falls back to the product's average cost. */
  unitPrice: number
  /** Empty when nobody has priced it yet. */
  supplierId: string
  supplier: string
  /** Muted reason line: "Out now · sells 9 a day". */
  reason: string
}

export type RestockGroup = { supplierId: string; supplier: string; items: RestockItem[] }

/**
 * What to buy on the next shopping day.
 *
 * Spec: suggested = (average daily sales × days until next restock) − stock,
 * rounded up to whole packs. "Days until next restock" is counted from today to
 * the trip *after* this one — what's bought on Thursday has to last until the
 * Thursday after, and today's stock is being sold until then too.
 *
 * One guard the formula doesn't have: anything at or below zero gets at least a
 * pack. An item that's out sells nothing, its average drops to nothing, and the
 * formula alone would never put it back on the list.
 */
export function restockList(s: AppState, now = Date.now()): RestockItem[] {
  // Nothing counted yet: every item reads as empty, and the list would be noise
  if (stockUncounted(s)) return []
  const horizon = daysToShopping(now, restockDayOf(s)) + RESTOCK_EVERY_DAYS

  const out: RestockItem[] = []
  for (const p of stockItems(s)) {
    const usage = dailyUsage(s, p.id, now)
    let need = usage * horizon - p.stock
    if (p.stock <= 0) need = Math.max(need, p.packSize)
    if (need <= 1e-9) continue

    const packs = Math.ceil(need / p.packSize - 1e-9)
    const cheapest = pricesFor(s, p.id)[0]
    out.push({
      product: p,
      packs,
      unitPrice: cheapest?.unitPrice ?? p.cost,
      supplierId: cheapest?.supplierId ?? '',
      supplier: cheapest ? supplierName(s, cheapest.supplierId) : '',
      reason: reasonFor(p, usage),
    })
  }
  return out
}

/** "Out now · sells 9 a day", "3 left · sells 2 a day", "Sold 4 past zero · …". */
function reasonFor(p: Product, usage: number) {
  const stock =
    p.stock < 0 ? `Sold ${unitQty(p, -p.stock)} past zero` : p.stock === 0 ? 'Out now' : `${unitQty(p, p.stock)} left`
  // Whole numbers from 1 up ("sells 14 a day", not 13.9); one decimal below that ("0.4 kg")
  const rate = usage >= 1 ? Math.round(usage) : Math.round(usage * 10) / 10
  const sells = usage > 0 ? `sells ${unitQty(p, rate)} a day` : 'no sales this week'
  return `${stock} · ${sells}`
}

/**
 * Grouped by where it's cheapest, suppliers A–Z, with "no price yet" last —
 * those still need buying, they just haven't got a place yet.
 */
export function groupBySupplier(items: RestockItem[]): RestockGroup[] {
  const map = new Map<string, RestockGroup>()
  for (const it of items) {
    const g = map.get(it.supplierId) ?? { supplierId: it.supplierId, supplier: it.supplier || 'No price yet', items: [] }
    g.items.push(it)
    map.set(it.supplierId, g)
  }
  return [...map.values()]
    .map((g) => ({ ...g, items: g.items.sort((a, b) => a.product.name.localeCompare(b.product.name)) }))
    .sort((a, b) => Number(!a.supplierId) - Number(!b.supplierId) || a.supplier.localeCompare(b.supplier))
}

/**
 * "2 trays", "1 crate", "3 loaves" — the pack word from the pack label ("tray
 * of 24" → tray), or the unit itself when it's bought one at a time.
 */
export function packText(p: Product, n: number) {
  if (p.packSize <= 1) return `${n} ${n === 1 ? p.unit : p.unitPlural}`
  const word = p.packLabel.trim().split(/\s+/)[0]?.toLowerCase() || 'pack'
  if (n === 1) return `1 ${word}`
  return `${n} ${/(s|x|ch|sh)$/.test(word) ? `${word}es` : `${word}s`}`
}

/** Cost of buying `packs` of an item. */
export const lineCost = (it: RestockItem, packs: number) =>
  Math.round(packs * it.product.packSize * it.unitPrice * 100) / 100
