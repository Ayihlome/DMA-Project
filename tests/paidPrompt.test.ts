/**
 * Prompt 3: after "Bought it", optionally "What did you pay?". The stock is already in; a price
 * the owner types updates the cost the same way receiving with a price would. Nothing typed
 * leaves the cost as it was, and a supplier's listed price is never used.
 */
import { describe, expect, it } from 'vitest'
import { receiveRestock, recordPaid, undoRestock } from '../src/data/actions'
import type { AppState, Product } from '../src/data/types'
import { paidPerUnit, unpricedLines } from '../src/screens/StockIn/stockInModel'

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
const chips = (): Product => ({ ...coke(0, 0), id: 'chips', name: 'Chips', unit: 'bag', unitPlural: 'bags', packSize: 48, packLabel: 'box of 48' })

function shop(products: Product[]): AppState {
  return {
    version: 1,
    products,
    suppliers: [{ id: 'makro', name: 'Makro' }],
    prices: [{ id: 'p1', supplierId: 'makro', productId: 'coke', unitPrice: 7, updatedAt: 0, history: [] }],
    preferred: {},
    sales: [],
    purchases: [],
    budget: 0,
    profile: { ownerName: 'Test', storeName: 'Test shop', role: 'Owner', memberSince: 0 },
    queue: [],
    lastSyncedAt: 0,
    onboardedAt: 0,
  }
}

/** "Bought it": recorded with no price, as RestockScreen does */
function boughtIt(s: AppState, lines: { productId: string; qty: number }[]) {
  const next = receiveRestock(s, lines.map((l) => ({ ...l, supplierId: 'makro', unitPrice: 0 })), 1000)
  return { s: next, ids: next.purchases.map((p) => p.id) }
}
const byId = (s: AppState, id: string) => s.products.find((p) => p.id === id)!

describe('after "Bought it"', () => {
  it('lists what came in with no price', () => {
    const { s, ids } = boughtIt(shop([coke(0, 0), chips()]), [{ productId: 'coke', qty: 48 }, { productId: 'chips', qty: 48 }])
    expect(unpricedLines(s, ids).map((l) => [l.product.id, l.qty])).toEqual([['coke', 48], ['chips', 48]])
  })

  it('leaves an unknown cost unknown, not the supplier’s listed R7', () => {
    const { s } = boughtIt(shop([coke(0, 0)]), [{ productId: 'coke', qty: 24 }])
    expect(byId(s, 'coke').cost).toBe(0)
  })
})

describe('typing what was paid', () => {
  it('sets an unknown cost from the total paid', () => {
    const { s, ids } = boughtIt(shop([coke(0, 0)]), [{ productId: 'coke', qty: 48 }])
    // R432 for two trays of 24: R9 a can
    const paid = recordPaid(s, ids, { coke: paidPerUnit('432', 48) })
    expect(byId(paid, 'coke').cost).toBe(9)
    expect(byId(paid, 'coke').stock).toBe(48)
    expect(paid.purchases[0].lines[0].unitPrice).toBe(9)
  })

  it('averages with what was already on the shelf, like receiving with a price', () => {
    const { s, ids } = boughtIt(shop([coke(24, 10)]), [{ productId: 'coke', qty: 24 }])
    expect(byId(s, 'coke').cost).toBe(10)
    const paid = recordPaid(s, ids, { coke: 8 })
    expect(byId(paid, 'coke').cost).toBe(9)
  })

  it('changes only what was typed, and never a supplier price', () => {
    const { s, ids } = boughtIt(shop([coke(0, 0), chips()]), [{ productId: 'coke', qty: 24 }, { productId: 'chips', qty: 48 }])
    const paid = recordPaid(s, ids, { coke: 9 })
    expect(byId(paid, 'chips').cost).toBe(0)
    expect(paid.prices).toEqual(s.prices)
  })

  it('does not overwrite a line that already has a price', () => {
    const s0 = receiveRestock(shop([coke(0, 0)]), [{ productId: 'coke', supplierId: 'makro', qty: 24, unitPrice: 9 }], 1000)
    const ids = s0.purchases.map((p) => p.id)
    expect(unpricedLines(s0, ids)).toEqual([])
    expect(recordPaid(s0, ids, { coke: 20 })).toBe(s0)
  })

  it('a 0 or nothing typed changes nothing', () => {
    const { s, ids } = boughtIt(shop([coke(0, 0)]), [{ productId: 'coke', qty: 24 }])
    expect(recordPaid(s, ids, {})).toBe(s)
    expect(recordPaid(s, ids, { coke: paidPerUnit('', 24) })).toBe(s)
  })

  it('Undo still takes the trip back out, cost included', () => {
    const { s, ids } = boughtIt(shop([coke(24, 10)]), [{ productId: 'coke', qty: 24 }])
    const undone = undoRestock(recordPaid(s, ids, { coke: 8 }), ids)
    expect(byId(undone, 'coke').stock).toBe(24)
    expect(byId(undone, 'coke').cost).toBe(10)
  })
})
