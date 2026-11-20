/**
 * Cost and profit are never invented: a cost of 0 means unknown, and anything built from an
 * unknown cost stays unknown instead of being added up as if it were free.
 */
import { describe, expect, it } from 'vitest'
import { buildMenuItem, createProduct, receiveRestock, recordSale, upsertProduct } from '../src/data/actions'
import { recipeCost } from '../src/data/inventory'
import { buildStarterCatalogue, commonBrands, KOTA_BUILDS, PACKS, POTATO_DEFAULTS } from '../src/data/starterPacks'
import type { AppState, Product } from '../src/data/types'
import { marginOf, profitReport } from '../src/screens/Profit/profitModel'

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
    onboardedAt: 0,
    ...extra,
  }
}

const item = (id: string, cost: number, extra: Partial<Product> = {}): Product => ({
  id,
  name: id,
  detail: '',
  category: 'ingredients',
  icon: 'kitchen',
  sellable: false,
  price: 0,
  cost,
  unit: 'unit',
  unitPlural: 'units',
  stock: 10,
  packSize: 1,
  packLabel: 'single unit',
  ...extra,
})

const byId = (s: AppState, id: string) => s.products.find((p) => p.id === id)!

describe('a recipe with any unknown ingredient cost', () => {
  it('has an unknown total cost (recipeCost)', () => {
    const costs: Record<string, number> = { bread: 14, cheese: 0 }
    expect(recipeCost([{ productId: 'bread', qty: 0.25 }, { productId: 'cheese', qty: 1 }], (id) => costs[id])).toBe(0)
    // An ingredient that is not in the shop at all is unknown too
    expect(recipeCost([{ productId: 'bread', qty: 0.25 }, { productId: 'gone', qty: 1 }], (id) => costs[id])).toBe(0)
    expect(recipeCost([], (id) => costs[id])).toBe(0)
  })

  it('has a real cost once every ingredient is known', () => {
    const costs: Record<string, number> = { bread: 14, cheese: 2.1 }
    expect(recipeCost([{ productId: 'bread', qty: 0.25 }, { productId: 'cheese', qty: 1 }], (id) => costs[id])).toBe(5.6)
  })

  it('stays unknown on a saved menu item, and recosting fills it in only when the last cost arrives', () => {
    let s = shop([item('bread', 14), item('cheese', 0), item('polony', 0)])
    const kota = buildMenuItem(s, {
      name: 'Kota',
      price: 30,
      menu: 'Kota',
      recipe: [
        { productId: 'bread', qty: 0.25 },
        { productId: 'cheese', qty: 1 },
        { productId: 'polony', qty: 0.05 },
      ],
    })
    expect(kota.cost).toBe(0)
    s = upsertProduct(s, kota)

    // One of two unknown costs arrives: still unknown, not a partial sum (recosted)
    s = receiveRestock(s, [{ productId: 'cheese', supplierId: '', qty: 24, unitPrice: 2.1 }], NOW)
    expect(byId(s, kota.id).cost).toBe(0)

    // The last one arrives: now it is the real sum
    s = receiveRestock(s, [{ productId: 'polony', supplierId: '', qty: 1, unitPrice: 60 }], NOW + 1000)
    expect(byId(s, kota.id).cost).toBe(Math.round((0.25 * 14 + 2.1 + 0.05 * 60) * 100) / 100)
  })

  it('has unknown profit in the Profit report', () => {
    const kota = item('kota', 0, { sellable: true, price: 30, composite: true, recipe: [{ productId: 'bread', qty: 0.25 }] })
    const coke = item('coke', 9, { sellable: true, price: 13, category: 'beverages' })
    let s = shop([item('bread', 0), kota, coke])
    s = recordSale(s, [{ productId: 'kota', qty: 2 }, { productId: 'coke', qty: 1 }], {}, NOW).state!

    expect(marginOf(byId(s, 'kota'))).toBeNull()
    const report = profitReport(s, NOW + 1000)
    const kotaRow = report.items.find((r) => r.product.id === 'kota')!
    expect(kotaRow.margin).toBeNull()
    expect(kotaRow.kept).toBe(0)
    // Profit only covers the coke: R4 kept on R13, out of R73 taken
    expect(report.takings).toBe(73)
    expect(report.kept).toBe(4)
    expect(report.covered).toBeCloseTo(13 / 73)
  })
})

describe('starter and brand items', () => {
  it('start with an unknown cost, kotas included', () => {
    const everything = buildStarterCatalogue({ packs: PACKS.map((p) => p.key), kotas: KOTA_BUILDS.map((b) => b.id) })
    expect(everything.length).toBeGreaterThan(30)
    expect(everything.filter((p) => p.cost !== 0).map((p) => p.id)).toEqual([])

    // Chips cut from potatoes add a potato ingredient; it starts unknown too
    const potato = buildStarterCatalogue({
      packs: ['kotas'],
      kotas: ['kota-chips'],
      kitchen: { chips: { mode: 'potato', ...POTATO_DEFAULTS } },
    })
    expect(potato.some((p) => p.id === 'potato')).toBe(true)
    expect(potato.filter((p) => p.cost !== 0).map((p) => p.id)).toEqual([])
  })

  it('from "Add common brands?" start with an unknown cost', () => {
    const brands = commonBrands([])
    expect(brands.length).toBeGreaterThan(0)
    for (const input of brands) expect(createProduct(shop([]), input).cost).toBe(0)
  })
})
