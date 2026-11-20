/**
 * Cold drinks in the app's own catalogues: the name, brand and size must say the same thing,
 * so the data itself is right rather than relying on the product form to rename it.
 */
import { describe, expect, it } from 'vitest'
import { createSeedState } from '../src/data/seed'
import { buildStarterCatalogue, commonBrands, KOTA_BUILDS, PACKS } from '../src/data/starterPacks'
import { drinkName } from '../src/screens/Products/productFormModel'

const mismatches = (items: { name: string; family?: string | null; variant?: string; size?: string }[]) =>
  items
    .filter((p) => p.family === 'colddrink')
    .filter((p) => !p.variant || !p.size || p.name !== drinkName(p.variant, p.size))
    .map((p) => `${p.name} (brand ${p.variant}, size ${p.size})`)

describe('cold drink name, brand and size agree', () => {
  it('in the starter packs', () => {
    const all = buildStarterCatalogue({ packs: PACKS.map((p) => p.key), kotas: KOTA_BUILDS.map((b) => b.id) })
    expect(all.some((p) => p.family === 'colddrink')).toBe(true)
    expect(mismatches(all)).toEqual([])
  })

  it('in "Add common brands?"', () => {
    const brands = commonBrands([])
    expect(brands.some((p) => p.family === 'colddrink')).toBe(true)
    expect(mismatches(brands)).toEqual([])
  })

  it('in the sample data', () => {
    expect(mismatches(createSeedState(0).products)).toEqual([])
  })
})
