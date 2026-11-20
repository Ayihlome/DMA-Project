/**
 * Recipe suggestions compare a count with what the recipes took off since the shop-wide count
 * date. A partial count resets some items' stock without moving that date, so until each item
 * has its own count date (Stage 6) suggestions are held back after a partial count.
 */
import { describe, expect, it } from 'vitest'
import { buildMenuItem, recordSale, setStockCounts } from '../src/data/actions'
import { recipeSuggestions, withChange } from '../src/data/recipeCheck'
import { buildStarterCatalogue } from '../src/data/starterPacks'
import type { AppState } from '../src/data/types'

const T0 = Date.UTC(2026, 9, 1)
const DAY = 86_400_000

/** A Kota Special shop, counted in full at T0. The recipe says 0.15 kg chips a kota; the kitchen really uses 0.2. */
function shop(): AppState {
  const stock: Record<string, number> = { bread: 100, fries: 10, polony: 10, 'cheese-slice': 100, atchar: 10 }
  return {
    version: 1,
    products: buildStarterCatalogue({ packs: ['kotas'], kotas: ['kota-special'] }).map((p) => (p.id in stock ? { ...p, stock: stock[p.id] } : p)),
    suppliers: [],
    prices: [],
    sales: [],
    purchases: [],
    preferred: {},
    budget: 0,
    profile: { ownerName: 'Test', storeName: 'Test shop', role: 'Owner', memberSince: 0 },
    queue: [],
    lastSyncedAt: 0,
    onboardedAt: T0,
    lastCountAt: T0,
  }
}

const sellKotas = (s: AppState, n: number, at: number) => recordSale(s, [{ productId: 'kota-special', qty: n }], {}, at).state!
const fries = (s: AppState) => s.products.find((p) => p.id === 'fries')!.stock

describe('a full count', () => {
  it('suggests the right chips amount after 10 kotas', () => {
    const s = sellKotas(shop(), 10, T0 + DAY)
    // Real use 10 × 0.2 = 2 kg, so 8 kg on the shelf; the app expects 8.5
    const suggestions = recipeSuggestions(s, { fries: 8 })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].changes[0]).toMatchObject({ menuId: 'kota-special', from: 0.15, to: 0.2 })
  })
})

describe('sell, count only the chips, sell more, count the chips again', () => {
  function run() {
    let s = sellKotas(shop(), 10, T0 + DAY) // 1. sell kotas
    s = setStockCounts(s, { fries: 8 }, T0 + 2 * DAY) // 2. count only the chips (really 8 kg)
    s = sellKotas(s, 10, T0 + 3 * DAY) // 3. sell more kotas
    return s
  }

  it('would compare the second count against sales from before the first one', () => {
    const s = run()
    // The partial count did not move the shop-wide date, so "since the last count" still starts at T0
    expect(s.lastCountAt).toBe(T0)
    expect(fries(s)).toBe(6.5)
  })

  it('holds suggestions back instead of suggesting 0.175 kg when the truth is 0.2', () => {
    // 4. count the chips again: really 6 kg. Measured from T0 the shortfall (0.5) is spread over
    // 20 kotas instead of 10, which would suggest 0.175 kg
    expect(recipeSuggestions(run(), { fries: 6 })).toEqual([])
  })

  it('still holds back at the next full count, then suggests again after it', () => {
    let s = run()
    const full = { fries: 6, bread: 95, polony: 9, 'cheese-slice': 80, atchar: 9.6 }
    expect(recipeSuggestions(s, full)).toEqual([])
    s = setStockCounts(s, full, T0 + 4 * DAY)
    expect(s.lastCountAt).toBe(T0 + 4 * DAY)

    // From a clean full count: 10 kotas, really 2 kg of chips, so 4 kg left; the app expects 4.5
    s = sellKotas(s, 10, T0 + 5 * DAY)
    const suggestions = recipeSuggestions(s, { fries: 4 })
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0].changes[0].to).toBe(0.2)
  })
})

describe('"Update recipe" from a count suggestion', () => {
  it('clears "sold without a recipe" like any other recipe save', () => {
    const base = shop()
    const s = { ...base, products: base.products.map((p) => (p.id === 'kota-special' ? { ...p, soldWithoutRecipe: 3 } : p)) }
    const kota = s.products.find((p) => p.id === 'kota-special')!
    // Exactly what CountStockScreen's update() saves
    const saved = buildMenuItem(s, { name: kota.name, price: kota.price, menu: kota.menu ?? 'Menu', recipe: withChange(kota.recipe!, 'fries', 0.2) }, kota.id)
    expect(saved.soldWithoutRecipe).toBe(0)
    expect(saved.recipe?.find((l) => l.productId === 'fries')?.qty).toBe(0.2)
  })
})
