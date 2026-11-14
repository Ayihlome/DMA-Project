/**
 * "Skip setup for now" gives an empty shop that still works, never the sample shop: no sample
 * products, suppliers, prices, stock, costs, sales, voids or orders. A shop the owner already
 * filled in is never emptied.
 */
import { describe, expect, it } from 'vitest'
import { createProduct, recordSale, skipOnboarding } from '../src/data/actions'
import { nothingToSell, recommendations, stockItems, stockUncounted } from '../src/data/inventory'
import { createSeedState } from '../src/data/seed'
import { QUICK_AMOUNT_ID } from '../src/data/types'
import { profitReport, weekProfit } from '../src/screens/Profit/profitModel'
import { restockList } from '../src/screens/Restock/restockModel'

const NOW = Date.UTC(2026, 9, 22, 10)

describe('skipping setup', () => {
  const seed = createSeedState(NOW)

  it('starts from the sample shop a new account holds, so the test means something', () => {
    expect(seed.onboardedAt).toBeNull()
    expect(seed.products.length).toBeGreaterThan(0)
    expect(seed.sales.length).toBeGreaterThan(0)
  })

  it('gives an empty shop: no sample products, suppliers, prices, sales, voids or orders', () => {
    const s = skipOnboarding(seed, { ownerName: 'Thandi', storeName: "Thandi's Spaza" }, NOW)
    expect(s.products).toEqual([])
    expect(s.suppliers).toEqual([])
    expect(s.prices).toEqual([])
    expect(s.preferred).toEqual({})
    expect(s.sales).toEqual([])
    expect(s.voidedSales ?? []).toEqual([])
    expect(s.purchases).toEqual([])
    expect(s.lastCountAt).toBeUndefined()
    expect(s.onboardedAt).toBe(NOW)
    expect(s.profile.storeName).toBe("Thandi's Spaza")
  })

  it('never empties a shop that has the owner’s own products', () => {
    const own = createProduct(seed, { name: 'Vetkoek', category: 'other', price: 5, stock: 0, unit: 'item', unitPlural: 'items', packSize: 1 })
    const mine = { ...seed, products: [...seed.products, own], sales: [] }
    const s = skipOnboarding(mine, {}, NOW)
    expect(s.products).toEqual(mine.products)
    expect(s.suppliers).toEqual(mine.suppliers)
    expect(s.prices).toEqual(mine.prices)
    expect(s.onboardedAt).toBe(NOW)
  })
})

describe('an empty shop', () => {
  const empty = skipOnboarding(createSeedState(NOW), {}, NOW)

  it('can still sell a quick amount', () => {
    const r = recordSale(empty, [{ productId: QUICK_AMOUNT_ID, qty: 1, price: 15, label: 'Other' }], { payment: 'Cash' }, NOW + 1000)
    expect(r.ok).toBe(true)
    expect(r.state!.sales[0].total).toBe(15)
  })

  it('has nothing to sell, so Home can say "Add what you sell"', () => {
    expect(nothingToSell(empty)).toBe(true)
    expect(nothingToSell(createSeedState(NOW))).toBe(false)
  })

  it('does not ask for a count when there is nothing to count', () => {
    expect(stockItems(empty)).toEqual([])
    expect(stockUncounted(empty)).toBe(false)
  })

  it('has an empty shopping list and no restock suggestions', () => {
    expect(restockList(empty, NOW)).toEqual([])
    expect(recommendations(empty, NOW)).toEqual([])
  })

  it('has an empty Profit report and no Home profit line, even after a quick amount', () => {
    const sold = recordSale(empty, [{ productId: QUICK_AMOUNT_ID, qty: 1, price: 15 }], {}, NOW).state!
    const report = profitReport(sold, NOW + 1000)
    expect(report.items).toEqual([])
    expect(report.takings).toBe(15)
    expect(report.covered).toBe(0)
    expect(weekProfit(sold, NOW + 1000)).toBeNull()
  })
})
