/**
 * Prompt 2: once a food item has been sold three times with no recipe, Home asks for its
 * ingredients. Once per item: answered or dismissed is final. Never on Sell.
 */
import { describe, expect, it } from 'vitest'
import { buildMenuItem, recordSale, upsertProduct } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { recipePromptFor } from '../src/screens/Menu/menuModel'

const food = (id: string, extra: Partial<Product> = {}): Product => ({
  id,
  name: id,
  detail: 'Made to order',
  category: 'hot',
  icon: 'lunch_dining',
  sellable: true,
  price: 30,
  cost: 0,
  unit: 'item',
  unitPlural: 'items',
  stock: 0,
  packSize: 1,
  packLabel: 'made to order',
  composite: true,
  recipe: [],
  menu: 'Kota',
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

const sell = (s: AppState, id: string, times: number) => {
  for (let i = 0; i < times; i++) s = recordSale(s, [{ productId: id, qty: 1 }], {}, i + 1).state!
  return s
}

describe('the missing-recipe prompt', () => {
  it('waits for the third sale', () => {
    const s = shop([food('kota')])
    expect(recipePromptFor(sell(s, 'kota', 2), {})).toBeNull()
    expect(recipePromptFor(sell(s, 'kota', 3), {})?.id).toBe('kota')
  })

  it('is not shown again once answered or dismissed', () => {
    const s = sell(shop([food('kota')]), 'kota', 5)
    expect(recipePromptFor(s, { 'recipe:kota': 'done' })).toBeNull()
    expect(recipePromptFor(s, { 'recipe:kota': 'dismissed' })).toBeNull()
  })

  it('goes once the item has a recipe', () => {
    let s = sell(shop([food('kota'), { ...food('bread'), composite: false, sellable: false, recipe: undefined, stock: 10 }]), 'kota', 3)
    s = upsertProduct(s, buildMenuItem(s, { name: 'kota', price: 30, menu: 'Kota', recipe: [{ productId: 'bread', qty: 0.25 }] }, 'kota'))
    expect(recipePromptFor(s, {})).toBeNull()
  })

  it('asks about the most-sold item first, one at a time', () => {
    let s = shop([food('kota'), food('burger', { menu: 'Burgers' })])
    s = sell(s, 'kota', 3)
    s = sell(s, 'burger', 6)
    expect(recipePromptFor(s, {})?.id).toBe('burger')
    expect(recipePromptFor(s, { 'recipe:burger': 'dismissed' })?.id).toBe('kota')
  })

  it('ignores items taken off the menu', () => {
    const s = sell(shop([food('kota')]), 'kota', 3)
    const off = { ...s, products: s.products.map((p) => ({ ...p, sellable: false })) }
    expect(recipePromptFor(off, {})).toBeNull()
  })
})
