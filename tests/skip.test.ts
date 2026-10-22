/**
 * "Explore with sample data" (skipping setup) gives the sample catalogue to look around and sell
 * from, but never the sample shop's invented takings or orders.
 */
import { describe, expect, it } from 'vitest'
import { recordSale, skipOnboarding } from '../src/data/actions'
import { createSeedState } from '../src/data/seed'

const NOW = Date.UTC(2026, 9, 22, 10)

describe('skipping setup', () => {
  const seed = createSeedState(NOW)

  it('starts from a seed that has demo sales and orders, so the test means something', () => {
    expect(seed.onboardedAt).toBeNull()
    expect(seed.sales.length).toBeGreaterThan(0)
    expect(seed.purchases.length).toBeGreaterThan(0)
  })

  it('keeps no demo sales, voids or orders', () => {
    const s = skipOnboarding(seed, { ownerName: 'Thandi', storeName: "Thandi's Spaza" }, NOW)
    expect(s.sales).toEqual([])
    expect(s.voidedSales ?? []).toEqual([])
    expect(s.purchases).toEqual([])
    expect(s.onboardedAt).toBe(NOW)
    expect(s.profile.storeName).toBe("Thandi's Spaza")
  })

  it('leaves Sell usable: the sample catalogue is there and a sale goes through', () => {
    const s = skipOnboarding(seed, {}, NOW)
    expect(s.products).toEqual(seed.products)
    const sellable = s.products.filter((p) => p.sellable && !p.composite)
    expect(sellable.length).toBeGreaterThan(0)
    const r = recordSale(s, [{ productId: sellable[0].id, qty: 1 }], { payment: 'Cash' }, NOW + 1000)
    expect(r.ok).toBe(true)
    expect(r.state!.sales).toHaveLength(1)
  })
})
