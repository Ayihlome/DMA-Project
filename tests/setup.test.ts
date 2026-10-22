/**
 * What the two-step setup hands over: the chosen catalogue with kotas on the standard recipe,
 * nothing counted (the shelf is counted later in Count the shelf), and none of the sample shop.
 */
import { describe, expect, it } from 'vitest'
import { applyStarterPacks } from '../src/data/actions'
import { stockItems, stockUncounted } from '../src/data/inventory'
import { createSeedState } from '../src/data/seed'

const NOW = Date.UTC(2026, 9, 22, 10)

describe('finishing setup', () => {
  const s = applyStarterPacks(createSeedState(NOW), { packs: ['drinks', 'kotas'], kotas: ['kota-special'] }, { storeName: 'Spaza' }, undefined, NOW)

  it('sets up the kotas picked in "What you stock", on the standard recipe', () => {
    const kota = s.products.find((p) => p.id === 'kota-special')!
    expect(kota.recipe?.length).toBeGreaterThan(0)
    expect(kota.recipeChecked).toBe(false)
  })

  it('counts nothing: every item starts at 0 and the shop asks for a count', () => {
    expect(stockItems(s).every((p) => p.stock === 0)).toBe(true)
    expect(s.lastCountAt).toBeUndefined()
    expect(stockUncounted(s)).toBe(true)
  })

  it('keeps none of the sample shop', () => {
    expect(s.sales).toEqual([])
    expect(s.purchases).toEqual([])
    expect(s.suppliers).toEqual([])
    expect(s.prices).toEqual([])
    expect(s.onboardedAt).toBe(NOW)
    expect(s.profile.storeName).toBe('Spaza')
  })
})
