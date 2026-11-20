/**
 * Stock came in records only what the owner typed: a supplier's listed price or the old cost is
 * not what was paid this time.
 */
import { describe, expect, it } from 'vitest'
import { receiveRestock } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { paidPerUnit } from '../src/screens/StockIn/stockInModel'

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

describe('receiving stock with no price typed', () => {
  it('records no price, whatever a supplier lists', () => {
    expect(paidPerUnit(undefined, 24)).toBe(0)
    expect(paidPerUnit('', 24)).toBe(0)
    expect(paidPerUnit('  ', 24)).toBe(0)
    expect(paidPerUnit('0', 24)).toBe(0)
    // What was typed is per step: a tray of 24 for R216 is R9 a can
    expect(paidPerUnit('216', 24)).toBe(9)
    expect(paidPerUnit('9,5', 1)).toBe(9.5)
  })

  it('leaves a known average cost unchanged instead of using the supplier price', () => {
    const s0 = shop([item('coke', 9, { packSize: 24 })], {
      suppliers: [{ id: 'makro', name: 'Makro' }],
      prices: [{ id: 'p1', supplierId: 'makro', productId: 'coke', unitPrice: 7, updatedAt: NOW, history: [] }],
    })
    const s = receiveRestock(s0, [{ productId: 'coke', supplierId: 'makro', qty: 24, unitPrice: paidPerUnit('', 24) }], NOW)
    expect(byId(s, 'coke').stock).toBe(34)
    expect(byId(s, 'coke').cost).toBe(9)
  })

  it('leaves an unknown cost unknown instead of using the supplier price or the old cost', () => {
    const s0 = shop([item('coke', 0, { packSize: 24 })], {
      suppliers: [{ id: 'makro', name: 'Makro' }],
      prices: [{ id: 'p1', supplierId: 'makro', productId: 'coke', unitPrice: 7, updatedAt: NOW, history: [] }],
    })
    const s = receiveRestock(s0, [{ productId: 'coke', supplierId: 'makro', qty: 24, unitPrice: paidPerUnit(undefined, 24) }], NOW)
    expect(byId(s, 'coke').cost).toBe(0)
  })
})
