/**
 * The stock rules on the default (local) data path: the pure functions in src/data that both
 * stores call. These do not cover the SQLite use cases in src/backend, which repeat the sale,
 * void and count rules on their own.
 */
import { describe, expect, it } from 'vitest'
import { receiveRestock, recordSale, setStockCounts, undoRestock, voidSale } from '../src/data/actions'
import { healthOf, stockItems } from '../src/data/inventory'
import { recipeSuggestions } from '../src/data/recipeCheck'
import { buildStarterCatalogue } from '../src/data/starterPacks'
import type { AppState, Product } from '../src/data/types'

const NOW = Date.UTC(2026, 9, 22, 10)

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
    onboardedAt: NOW - 86_400_000,
    ...extra,
  }
}

/** Bread & dairy plus the Kota Special, with the standard recipe (no kitchen answers). */
function kotaShop(stock: Record<string, number>, extra: Partial<AppState> = {}) {
  const products = buildStarterCatalogue({ packs: ['bread', 'kotas'], kotas: ['kota-special'] }).map((p) =>
    p.id in stock ? { ...p, stock: stock[p.id] } : p,
  )
  return shop(products, extra)
}

const byId = (s: AppState, id: string) => s.products.find((p) => p.id === id)!

function sell(s: AppState, productId: string, qty: number, at = NOW): AppState {
  const r = recordSale(s, [{ productId, qty }], { payment: 'Cash' }, at)
  expect(r.ok).toBe(true)
  return r.state!
}

describe('a sale deducts recipe ingredients', () => {
  it('takes a quarter loaf, chips, polony, a cheese slice and atchar off for one Kota Special', () => {
    const s = sell(kotaShop({ bread: 10, fries: 4, polony: 2, 'cheese-slice': 24, atchar: 1 }), 'kota-special', 1)
    expect(byId(s, 'bread').stock).toBe(9.75)
    expect(byId(s, 'fries').stock).toBe(3.85)
    expect(byId(s, 'polony').stock).toBe(1.95)
    expect(byId(s, 'cheese-slice').stock).toBe(23)
    expect(byId(s, 'atchar').stock).toBe(0.98)
    // A kota has no stock of its own to take from
    expect(byId(s, 'kota-special').stock).toBe(0)
  })

  it('multiplies by the quantity sold', () => {
    const s = sell(kotaShop({ bread: 10, 'cheese-slice': 24 }), 'kota-special', 4)
    expect(byId(s, 'bread').stock).toBe(9)
    expect(byId(s, 'cheese-slice').stock).toBe(20)
  })
})

describe('a sale at zero stock', () => {
  it('completes, goes negative and is flagged', () => {
    const s = sell(kotaShop({ milk: 0 }), 'milk', 1)
    expect(s.sales).toHaveLength(1)
    expect(byId(s, 'milk').stock).toBe(-1)
    // What Home's "to check" and Count stock's "Check these first" both look for
    expect(stockItems(s).filter((p) => p.stock < 0).map((p) => p.id)).toEqual(['milk'])
    expect(healthOf(s, byId(s, 'milk'), NOW)).toBe('out')
  })
})

describe('a sale with no recipe', () => {
  it('completes, deducts nothing and is flagged', () => {
    const base = kotaShop({ bread: 10 })
    const s0 = { ...base, products: base.products.map((p) => (p.id === 'kota-special' ? { ...p, recipe: null } : p)) }
    const s = sell(s0, 'kota-special', 2)
    expect(s.sales).toHaveLength(1)
    expect(byId(s, 'bread').stock).toBe(10)
    expect(byId(s, 'kota-special').soldWithoutRecipe).toBe(2)
    expect(healthOf(s, byId(s, 'kota-special'), NOW)).toBe('setup')
  })
})

describe('void', () => {
  it('puts the stock back and moves the sale to voided sales', () => {
    const s1 = sell(kotaShop({ bread: 10, 'cheese-slice': 24, milk: 5 }), 'kota-special', 2)
    const s2 = sell(s1, 'milk', 1)
    const kotaSale = s2.sales[0]
    const s3 = voidSale(s2, kotaSale.id, NOW + 1000)
    expect(byId(s3, 'bread').stock).toBe(10)
    expect(byId(s3, 'cheese-slice').stock).toBe(24)
    // The other sale is untouched
    expect(byId(s3, 'milk').stock).toBe(4)
    expect(s3.sales.map((x) => x.id)).toEqual([s2.sales[1].id])
    expect(s3.voidedSales?.map((x) => x.id)).toEqual([kotaSale.id])
  })

  it('takes back the "sold without a recipe" count it added', () => {
    const base = kotaShop({})
    const s0 = { ...base, products: base.products.map((p) => (p.id === 'kota-special' ? { ...p, recipe: null } : p)) }
    const s1 = sell(s0, 'kota-special', 3)
    const s2 = voidSale(s1, s1.sales[0].id)
    expect(byId(s2, 'kota-special').soldWithoutRecipe).toBe(0)
  })
})

describe('receiving stock with a price', () => {
  const coke = (stock: number, cost: number): Product => ({
    id: 'coke',
    name: 'Coke can',
    detail: '',
    category: 'beverages',
    icon: 'local_bar',
    sellable: true,
    price: 13,
    cost,
    unit: 'can',
    unitPlural: 'cans',
    stock,
    packSize: 24,
    packLabel: 'tray of 24',
  })

  it('sets the cost from the first delivery and averages the next one', () => {
    const s1 = receiveRestock(shop([coke(0, 0)]), [{ productId: 'coke', supplierId: '', qty: 24, unitPrice: 9 }], NOW)
    expect(byId(s1, 'coke').stock).toBe(24)
    expect(byId(s1, 'coke').cost).toBe(9)
    const s2 = receiveRestock(s1, [{ productId: 'coke', supplierId: '', qty: 24, unitPrice: 11 }], NOW + 1000)
    expect(byId(s2, 'coke').stock).toBe(48)
    expect(byId(s2, 'coke').cost).toBe(10)
  })

  it('undo takes the stock back out and restores the earlier cost', () => {
    const s1 = receiveRestock(shop([coke(24, 9)]), [{ productId: 'coke', supplierId: '', qty: 24, unitPrice: 11 }], NOW)
    const ids = s1.purchases.map((p) => p.id)
    const s2 = undoRestock(s1, ids)
    expect(byId(s2, 'coke').stock).toBe(24)
    expect(byId(s2, 'coke').cost).toBe(9)
    expect(s2.purchases).toHaveLength(0)
  })

  it('adds onto negative stock, so an oversold item lands on the true number', () => {
    const s = receiveRestock(shop([coke(-3, 9)]), [{ productId: 'coke', supplierId: '', qty: 24, unitPrice: 9 }], NOW)
    expect(byId(s, 'coke').stock).toBe(21)
  })
})

describe('sales before the first count', () => {
  it('the first count sets the balance without replaying earlier sales', () => {
    // Nothing counted yet: every item at 0, no count date
    let s = kotaShop({}, { lastCountAt: undefined })
    s = sell(s, 'kota-special', 1, NOW)
    s = sell(s, 'kota-special', 2, NOW + 1000)
    expect(byId(s, 'bread').stock).toBe(-0.75)

    // A count below zero has no trustworthy starting point, so it suggests no recipe change
    expect(recipeSuggestions(s, { bread: 10 })).toEqual([])

    const counted = setStockCounts(s, { bread: 10 }, NOW + 2000)
    expect(byId(counted, 'bread').stock).toBe(10)
    expect(counted.lastCountAt).toBe(NOW + 2000)
    // Sales history is untouched
    expect(counted.sales).toEqual(s.sales)

    // Later sales carry on from the counted number
    const after = sell(counted, 'kota-special', 1, NOW + 3000)
    expect(byId(after, 'bread').stock).toBe(9.75)
  })

  it('a count sets the number, it never adds to it like a delivery', () => {
    const s = setStockCounts(kotaShop({ milk: 7 }), { milk: 5 }, NOW)
    expect(byId(s, 'milk').stock).toBe(5)
  })
})
