/**
 * Recipe status: a starter kota recipe is the app's standard one until the owner saves it.
 * Saving a recipe (from Menu, or "Update recipe" after a count) marks it checked. Recipes from
 * before this existed have no status and show no label. The status never changes a calculation.
 */
import { describe, expect, it } from 'vitest'
import { buildMenuItem, recordSale } from '../src/data/actions'
import { deductionsFor } from '../src/data/inventory'
import { withChange } from '../src/data/recipeCheck'
import { buildStarterCatalogue } from '../src/data/starterPacks'
import type { AppState, Product } from '../src/data/types'
import { productMeta } from '../src/data/sqlitePersist'
import { recipeStatusLabel } from '../src/screens/Menu/menuModel'

const catalogue = () => buildStarterCatalogue({ packs: ['bread', 'kotas'], kotas: ['kota-special', 'kota-chips'] })

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

describe('starter kota recipes', () => {
  it('start as the standard recipe, not checked by the owner', () => {
    const kotas = catalogue().filter((p) => p.composite)
    expect(kotas.length).toBe(2)
    for (const k of kotas) {
      expect(k.recipeChecked).toBe(false)
      expect(recipeStatusLabel(k)).toBe('Standard recipe, not checked by you yet')
    }
  })

  it('remember which starter item they came from, ingredients included', () => {
    const products = catalogue()
    expect(products.find((p) => p.id === 'kota-special')?.template).toBe('kota-special')
    expect(products.find((p) => p.id === 'fries')?.template).toBe('fries')
    expect(products.find((p) => p.id === 'milk')?.template).toBe('milk')
  })
})

describe('saving a recipe marks it checked', () => {
  it('from Menu', () => {
    const s = shop(catalogue())
    const kota = s.products.find((p) => p.id === 'kota-special')!
    const saved = buildMenuItem(s, { name: kota.name, price: 40, menu: 'Kota', recipe: kota.recipe! }, kota.id)
    expect(saved.recipeChecked).toBe(true)
    expect(recipeStatusLabel(saved)).toBeNull()
  })

  it('from "Update recipe" after a count', () => {
    const s = shop(catalogue())
    const kota = s.products.find((p) => p.id === 'kota-special')!
    const saved = buildMenuItem(s, { name: kota.name, price: kota.price, menu: 'Kota', recipe: withChange(kota.recipe!, 'fries', 0.2) }, kota.id)
    expect(saved.recipeChecked).toBe(true)
  })

  it('a new menu item the owner makes is their own recipe', () => {
    const s = shop(catalogue())
    const saved = buildMenuItem(s, { name: 'Burger', price: 45, menu: 'Burgers', recipe: [{ productId: 'bread', qty: 0.5 }] })
    expect(saved.recipeChecked).toBe(true)
  })

  it('but not when it is saved with no recipe at all', () => {
    const s = shop(catalogue())
    const kota = s.products.find((p) => p.id === 'kota-special')!
    expect(buildMenuItem(s, { name: kota.name, price: kota.price, menu: 'Kota', recipe: [] }, kota.id).recipeChecked).toBe(false)
    expect(buildMenuItem(s, { name: 'Pap', price: 10, menu: 'Menu', recipe: [] }).recipeChecked).toBeUndefined()
  })
})

describe('recipes with no status', () => {
  it('show no label', () => {
    const legacy: Product = { ...catalogue().find((p) => p.id === 'kota-special')!, recipeChecked: undefined }
    expect(recipeStatusLabel(legacy)).toBeNull()
    expect(recipeStatusLabel(catalogue().find((p) => p.id === 'milk')!)).toBeNull()
  })
})

describe('the status', () => {
  it('changes no deduction', () => {
    const products = catalogue().map((p) => ({ ...p, stock: 10 }))
    const standard = shop(products)
    const checked = shop(products.map((p) => (p.composite ? { ...p, recipeChecked: true } : p)))
    const lines = [{ productId: 'kota-special', qty: 3 }]
    expect([...deductionsFor(checked, lines)]).toEqual([...deductionsFor(standard, lines)])
    const a = recordSale(standard, lines, {}, 1).state!.products.map((p) => p.stock)
    const b = recordSale(checked, lines, {}, 1).state!.products.map((p) => p.stock)
    expect(b).toEqual(a)
  })

  it('travels with the product on the SQLite path (product meta)', () => {
    const kota = catalogue().find((p) => p.id === 'kota-special')!
    expect(productMeta(kota)).toMatchObject({ recipeChecked: false, template: 'kota-special' })
    expect(productMeta({ ...kota, recipeChecked: true })).toMatchObject({ recipeChecked: true })
  })
})
