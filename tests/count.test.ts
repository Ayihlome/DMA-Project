/**
 * A count only records what the owner actually counted. An item they did not touch keeps the
 * app's number, including a negative one, which is what flags it for a recount.
 */
import { describe, expect, it } from 'vitest'
import { isFullCount, recordSale, setStockCounts } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { stepFrom } from '../src/screens/Onboarding/countModel'

const NOW = Date.UTC(2026, 9, 22, 10)

const product = (id: string, stock: number, extra: Partial<Product> = {}): Product => ({
  id,
  name: id,
  detail: '',
  category: 'pantry',
  icon: 'grain',
  sellable: true,
  price: 10,
  cost: 0,
  unit: 'unit',
  unitPlural: 'units',
  stock,
  packSize: 1,
  packLabel: 'single unit',
  ...extra,
})

function shop(products: Product[], extra: Partial<AppState> = {}): AppState {
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
    ...extra,
  }
}

const byId = (s: AppState, id: string) => s.products.find((p) => p.id === id)!

/** Milk counted, sugar oversold and not counted, a kota sold with no recipe, airtime never counted. */
function shopWithFlags() {
  let s = shop(
    [
      product('milk', 4),
      product('sugar', 0),
      product('kota', 0, { composite: true, recipe: null }),
      product('airtime', 0, { untracked: true }),
    ],
    { lastCountAt: NOW - 86_400_000 },
  )
  s = recordSale(s, [{ productId: 'sugar', qty: 2 }, { productId: 'kota', qty: 1 }], {}, NOW).state!
  expect(byId(s, 'sugar').stock).toBe(-2)
  expect(byId(s, 'kota').soldWithoutRecipe).toBe(1)
  return s
}

describe('a partial count', () => {
  it('sets only the items that were counted', () => {
    const s = setStockCounts(shopWithFlags(), { milk: 6 }, NOW + 1000)
    expect(byId(s, 'milk').stock).toBe(6)
    // Not touched: still -2, still flagged for a recount, not quietly reset to 0
    expect(byId(s, 'sugar').stock).toBe(-2)
  })

  it('keeps the "sold without a recipe" flags and the count date', () => {
    const before = shopWithFlags()
    const s = setStockCounts(before, { milk: 6 }, NOW + 1000)
    expect(byId(s, 'kota').soldWithoutRecipe).toBe(1)
    expect(s.lastCountAt).toBe(before.lastCountAt)
  })
})

describe('a full count', () => {
  it('is every item with a shelf count, not kotas or airtime', () => {
    const s = shopWithFlags()
    expect(isFullCount(s, { milk: 6 })).toBe(false)
    expect(isFullCount(s, { milk: 6, sugar: 1 })).toBe(true)
  })

  it('clears the flags and moves the count date, as before', () => {
    const s = setStockCounts(shopWithFlags(), { milk: 6, sugar: 1 }, NOW + 1000)
    expect(byId(s, 'sugar').stock).toBe(1)
    expect(byId(s, 'kota').soldWithoutRecipe).toBe(0)
    expect(s.lastCountAt).toBe(NOW + 1000)
  })
})

describe('the count screen stepper', () => {
  it('starts from what the app thinks is there until the owner touches the row', () => {
    expect(stepFrom(undefined, 12, 1)).toBe(13)
    expect(stepFrom(undefined, 12, -1)).toBe(11)
    // A negative number can't be on a shelf, so it steps from 0
    expect(stepFrom(undefined, -3, 1)).toBe(1)
    expect(stepFrom(undefined, 0, -1)).toBe(0)
  })

  it('steps from the counted number once touched', () => {
    expect(stepFrom(5, 12, 1)).toBe(6)
    expect(stepFrom(0.5, 3, 0.5)).toBe(1)
  })
})
