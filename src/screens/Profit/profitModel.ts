import { DAY } from '../../data/inventory'
import type { AppState, Product } from '../../data/types'

/**
 * What one unit of a product costs when it is sold at `price`. Airtime is bought
 * at a fixed percentage of its face value, so its cost follows the amount rung
 * up; everything else costs what its `cost` says.
 */
export function unitCostAt(p: Product, price: number) {
  const base = p.priceOptions?.[0]
  return base && base > 0 ? price * (p.cost / base) : p.cost
}

/** A product with no cost yet has no margin worth showing — zero would read as 100% profit. */
export const hasCost = (p: Product) => p.cost > 0

export type Margin = { price: number; cost: number; keep: number; percent: number }

/** What the owner keeps on one sale of `p` at its list price, or null when its cost isn't known. */
export function marginOf(p: Product): Margin | null {
  if (!p.sellable || !hasCost(p) || !(p.price > 0)) return null
  const price = p.priceOptions?.[0] ?? p.price
  const cost = unitCostAt(p, price)
  const keep = price - cost
  return { price, cost, keep, percent: Math.round((keep / price) * 100) }
}

export type ItemRow = {
  product: Product
  margin: Margin | null
  sold: number
  /** What was kept on this item over the window. Zero when its cost is unknown. */
  kept: number
}

export type ProfitReport = {
  days: number
  takings: number
  cost: number
  kept: number
  /** Share of takings (0–1) from items whose cost is known; the profit above covers only those. */
  covered: number
  items: ItemRow[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * The last `days` days of sales against today's costs. Costs are not kept per
 * sale, so a price paid last week is not remembered: this is the profit the
 * current costs would have given.
 */
export function profitReport(s: AppState, now = Date.now(), days = 7): ProfitReport {
  const since = now - days * DAY
  const byId = new Map(s.products.map((p) => [p.id, p]))
  const sold = new Map<string, number>()
  const kept = new Map<string, number>()

  let takings = 0
  let costedTakings = 0
  let cost = 0

  for (const sale of s.sales) {
    if (sale.at < since) continue
    for (const l of sale.lines) {
      const amount = l.qty * l.price
      takings += amount
      const p = byId.get(l.productId)
      if (!p) continue
      sold.set(p.id, (sold.get(p.id) ?? 0) + l.qty)
      if (!hasCost(p)) continue
      const lineCost = l.qty * unitCostAt(p, l.price)
      costedTakings += amount
      cost += lineCost
      kept.set(p.id, (kept.get(p.id) ?? 0) + amount - lineCost)
    }
  }

  const items = s.products
    .filter((p) => p.sellable)
    .map((product) => ({ product, margin: marginOf(product), sold: sold.get(product.id) ?? 0, kept: round2(kept.get(product.id) ?? 0) }))
    // Known margins first, biggest earner first; items still missing a cost go last
    .sort(
      (a, b) =>
        Number(!!b.margin) - Number(!!a.margin) ||
        b.kept - a.kept ||
        (b.margin?.keep ?? 0) - (a.margin?.keep ?? 0) ||
        a.product.name.localeCompare(b.product.name),
    )

  return {
    days,
    takings: round2(takings),
    cost: round2(cost),
    kept: round2(costedTakings - cost),
    covered: takings > 0 ? costedTakings / takings : 0,
    items,
  }
}

export type WeekProfit = {
  /** What was kept on the items with a known cost. */
  kept: number
  /** Share of the week's takings (0–1) that `kept` covers. */
  covered: number
  /** Items sold this week whose cost is not known yet. */
  missing: number
}

/**
 * The profit line on Home: the last 7 days, or null while nothing sold has a
 * known cost, so a shop that hasn't recorded what it pays sees no number at all
 * rather than one that looks complete.
 */
export function weekProfit(s: AppState, now = Date.now()): WeekProfit | null {
  const report = profitReport(s, now, 7)
  if (!(report.covered > 0)) return null
  return {
    kept: report.kept,
    covered: report.covered,
    missing: report.items.filter((r) => r.sold > 0 && !hasCost(r.product)).length,
  }
}
