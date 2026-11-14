/**
 * "How do you make them?", answered later from Menu instead of during setup. The answers
 * rebuild only the standard kota recipes (not checked by the owner yet); a recipe the owner
 * saved, or one with no status, is never touched.
 */
import { describe, expect, it } from 'vitest'
import { applyKitchen } from '../src/data/actions'
import { buildStarterCatalogue, defaultKitchen, kitchenFrom, POTATO_DEFAULTS, type KitchenAnswers } from '../src/data/starterPacks'
import type { AppState, Product } from '../src/data/types'

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

const kotaShop = (kitchen?: KitchenAnswers) =>
  shop(buildStarterCatalogue({ packs: ['kotas'], kotas: ['kota-special', 'kota-chips', 'russian-chips'], kitchen }))
const byId = (s: AppState, id: string) => s.products.find((p) => p.id === id)!
const qtyOf = (s: AppState, kotaId: string, ingredientId: string) => byId(s, kotaId).recipe?.find((l) => l.productId === ingredientId)?.qty

describe('applying the kitchen answers', () => {
  it('rebuilds the standard recipes: a loaf makes 5 kotas', () => {
    const k = defaultKitchen()
    const s = applyKitchen(kotaShop(), { ...k, answers: { ...k.answers, bread: 5 } })
    expect(qtyOf(s, 'kota-special', 'bread')).toBe(0.2)
    expect(qtyOf(s, 'kota-chips', 'bread')).toBe(0.2)
    // Still the app's recipe, now sized the owner's way: they haven't checked each one
    expect(byId(s, 'kota-special').recipeChecked).toBe(false)
  })

  it('leaves a recipe the owner saved, and one with no status, alone', () => {
    const base = kotaShop()
    const s0 = shop(
      base.products.map((p) =>
        p.id === 'kota-special' ? { ...p, recipeChecked: true } : p.id === 'kota-chips' ? { ...p, recipeChecked: undefined } : p,
      ),
    )
    const k = defaultKitchen()
    const s = applyKitchen(s0, { ...k, answers: { ...k.answers, bread: 5 } })
    expect(byId(s, 'kota-special').recipe).toEqual(byId(s0, 'kota-special').recipe)
    expect(byId(s, 'kota-chips').recipe).toEqual(byId(s0, 'kota-chips').recipe)
  })

  it('changes nothing when no recipe is still the standard one', () => {
    const s0 = shop(kotaShop().products.map((p) => (p.composite ? { ...p, recipeChecked: true } : p)))
    expect(applyKitchen(s0, defaultKitchen())).toBe(s0)
  })

  it('with potatoes: adds one Potatoes ingredient and uses it instead of frozen chips', () => {
    const potato = { mode: 'potato' as const, ...POTATO_DEFAULTS }
    let n = 0
    const s = applyKitchen(kotaShop(), { ...defaultKitchen(), chips: potato }, () => `uuid-${++n}`)
    const potatoes = s.products.filter((p) => p.template === 'potato')
    expect(potatoes).toHaveLength(1)
    expect(potatoes[0]).toMatchObject({ id: 'uuid-1', unit: 'potato', packSize: 30, cost: 0, sellable: false })
    expect(potatoes[0].portion?.perUnit).toBe(5)
    // 10 chips a kota at 5 chips a potato: 2 potatoes; Russian & Chips gets a bigger portion
    expect(qtyOf(s, 'kota-special', 'uuid-1')).toBe(2)
    expect(qtyOf(s, 'russian-chips', 'uuid-1')).toBeCloseTo(2.6667, 4)
    expect(qtyOf(s, 'kota-special', 'fries')).toBeUndefined()
    // The frozen chips stay in stock, untouched
    expect(byId(s, 'fries')).toEqual(byId(kotaShop(), 'fries'))

    // Answering again finds the same potatoes instead of adding more
    const again = applyKitchen(s, { ...defaultKitchen(), chips: { ...potato, chipsPerKota: 15 } }, () => `uuid-${++n}`)
    expect(again.products.filter((p) => p.template === 'potato')).toHaveLength(1)
    expect(qtyOf(again, 'kota-special', 'uuid-1')).toBe(3)
  })

  it('back to frozen bags: the recipes use the frozen chips again', () => {
    const potato = { mode: 'potato' as const, ...POTATO_DEFAULTS }
    const s1 = applyKitchen(kotaShop(), { ...defaultKitchen(), chips: potato })
    const s2 = applyKitchen(s1, { ...defaultKitchen(), chips: { mode: 'bag', kotasPerBag: 10 } })
    expect(qtyOf(s2, 'kota-special', 'fries')).toBe(0.2)
    expect(byId(s2, 'kota-special').recipe?.some((l) => l.productId === 'potato')).toBe(false)
  })

  it('never invents a cost', () => {
    const s = applyKitchen(kotaShop(), { ...defaultKitchen(), chips: { mode: 'potato', ...POTATO_DEFAULTS } })
    expect(s.products.filter((p) => p.cost !== 0).map((p) => p.id)).toEqual([])
  })
})

describe('reading the answers back', () => {
  it('gives the answers the recipes were built with, so reopening the questions shows them', () => {
    const k: Required<KitchenAnswers> = { answers: { bread: 5, polony: 25, 'cheese-slice': 2, atchar: 40 }, chips: { mode: 'bag', kotasPerBag: 10 } }
    expect(kitchenFrom(kotaShop(k).products)).toEqual(k)
  })

  it('reads potatoes back too', () => {
    const chips = { mode: 'potato' as const, chipsPerPotato: 6, chipsPerKota: 12, potatoesPerBag: 40 }
    const s = applyKitchen(kotaShop(), { ...defaultKitchen(), chips })
    expect(kitchenFrom(s.products).chips).toEqual(chips)
  })

  it('falls back to the standard answers for anything it cannot read', () => {
    expect(kitchenFrom([])).toEqual(defaultKitchen())
  })
})
