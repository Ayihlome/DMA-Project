/**
 * The shopping list, worked out from the shop state with no React in it.
 */
import { dailyUsage, pricesFor, stockItems, stockUncounted, supplierName, unitQty } from '../../data/inventory'
import type { AppState, Product } from '../../data/types'

/**
 * How many days the list buys for: the next week, whatever day it is. There is
 * no shopping day to set (a shop's restockDay from before is ignored).
 */
export const LIST_COVERS_DAYS = 7

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
 * What to buy so the shop lasts the next week.
 *
 * Suggested = (average daily sales × 7 days) − stock, rounded up to whole packs.
 *
 * One guard the formula doesn't have: anything at or below zero gets at least a
 * pack. An item that's out sells nothing, its average drops to nothing, and the
 * formula alone would never put it back on the list.
 */
export function restockList(s: AppState, now = Date.now()): RestockItem[] {
  // Nothing counted yet: every item reads as empty, and the list would be noise
  if (stockUncounted(s)) return []
  const horizon = LIST_COVERS_DAYS

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
