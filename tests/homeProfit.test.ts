/**
 * Home's profit line shows only when some of the week's takings have a known cost, and says how
 * much it covers and how many items it leaves out, so it never looks more complete than it is.
 */
import { describe, expect, it } from 'vitest'
import { recordSale } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { weekProfit } from '../src/screens/Profit/profitModel'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 9, 22, 10)

const product = (id: string, price: number, cost: number, extra: Partial<Product> = {}): Product => ({
  id,
  name: id,
  detail: '',
  category: 'pantry',
  icon: 'grain',
  sellable: true,
  price,
  cost,
  unit: 'unit',
  unitPlural: 'units',
  stock: 10,
  packSize: 1,
  packLabel: 'single unit',
  ...extra,
})

function shop(products: Product[]): AppState {
  return {
    version: 1,
    products,
    suppliers: [],
    prices: [],
    sales: [],
    purchases: [],
    preferred: {},
    budget: 0,
    profile: { ownerName: 'Test', storeName: 'Test shop', role: 'Owner', memberSince: 0 },
    queue: [],
    lastSyncedAt: 0,
    onboardedAt: 0,
  }
}

const sell = (s: AppState, lines: { productId: string; qty: number; price?: number }[], at: number) => recordSale(s, lines, {}, at).state!

describe('the Home profit line', () => {
  const products = [product('coke', 13, 9), product('chips', 9, 6), product('kota', 30, 0), product('bread', 18, 0)]

  it('is hidden with no sales', () => {
    expect(weekProfit(shop(products), NOW)).toBeNull()
  })

  it('is hidden when nothing sold this week has a known cost', () => {
    const s = sell(shop(products), [{ productId: 'kota', qty: 2 }], NOW - 1000)
    expect(weekProfit(s, NOW)).toBeNull()
  })

  it('states what it covers and how many items sold have no cost', () => {
    let s = shop(products)
    s = sell(s, [{ productId: 'coke', qty: 1 }, { productId: 'kota', qty: 2 }], NOW - 2 * DAY)
    s = sell(s, [{ productId: 'bread', qty: 1 }], NOW - DAY)
    const line = weekProfit(s, NOW)!
    // R4 kept on the coke; the kotas (R60) and the bread (R18) have no cost
    expect(line.kept).toBe(4)
    expect(line.covered).toBeCloseTo(13 / 91)
    expect(line.missing).toBe(2)
  })

  it('covers everything when every item sold has a cost', () => {
    const s = sell(shop(products), [{ productId: 'coke', qty: 2 }, { productId: 'chips', qty: 1 }], NOW - 1000)
    const line = weekProfit(s, NOW)!
    expect(line.kept).toBe(2 * 4 + 3)
    expect(line.covered).toBe(1)
    expect(line.missing).toBe(0)
  })

  it('counts only the last 7 days', () => {
    let s = sell(shop(products), [{ productId: 'kota', qty: 5 }], NOW - 8 * DAY)
    s = sell(s, [{ productId: 'coke', qty: 1 }], NOW - 1000)
    const line = weekProfit(s, NOW)!
    expect(line.covered).toBe(1)
    expect(line.missing).toBe(0)
  })

  it('leaves a quick amount out of the item count but not out of the coverage', () => {
    const s = sell(shop(products), [{ productId: 'coke', qty: 1 }, { productId: 'quick-amount', qty: 1, price: 7 }], NOW - 1000)
    const line = weekProfit(s, NOW)!
    expect(line.covered).toBeCloseTo(13 / 20)
    expect(line.missing).toBe(0)
  })
})
