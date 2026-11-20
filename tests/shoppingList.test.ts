/**
 * The shopping list covers the next 7 days, whatever day it is. There is no shopping day to set.
 */
import { describe, expect, it } from 'vitest'
import { recordSale } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { restockList } from '../src/screens/Restock/restockModel'

const DAY = 86_400_000
const MONDAY = Date.UTC(2026, 9, 19, 10)
const FRIDAY = Date.UTC(2026, 9, 23, 10)

const coke: Product = {
  id: 'coke',
  name: 'Coke can',
  detail: '',
  category: 'beverages',
  icon: 'local_bar',
  sellable: true,
  price: 13,
  cost: 0,
  unit: 'can',
  unitPlural: 'cans',
  stock: 100,
  packSize: 6,
  packLabel: 'pack of 6',
}

/** 14 cans sold over the week before `now`: 2 a day, with 10 left on the shelf. */
function shop(now: number): AppState {
  let s: AppState = {
    version: 1,
    products: [coke],
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
    restockDay: 4,
  }
  s = recordSale(s, [{ productId: 'coke', qty: 14 }], {}, now - 3 * DAY).state!
  return { ...s, products: s.products.map((p) => ({ ...p, stock: 10 })) }
}

describe('the shopping list', () => {
  it('buys enough for the next 7 days, in whole packs', () => {
    // 2 a day × 7 days = 14, minus the 10 on the shelf = 4, rounded up to one pack of 6
    const [item] = restockList(shop(MONDAY), MONDAY)
    expect(item.product.id).toBe('coke')
    expect(item.packs).toBe(1)
  })

  it('is the same on any day of the week, whatever shopping day was saved before', () => {
    expect(restockList(shop(MONDAY), MONDAY).map((i) => i.packs)).toEqual(restockList(shop(FRIDAY), FRIDAY).map((i) => i.packs))
  })
})
