/**
 * Prompt 1: on the first receipt of an item whose pack size isn't known, ask how it is bought.
 * Asked once: the answer, or "Not now", is remembered per owner under stockevo-hints:<ownerId>.
 */
import { describe, expect, it } from 'vitest'
import { createProduct, receiveRestock, updateProduct } from '../src/data/actions'
import { buildStarterCatalogue } from '../src/data/starterPacks'
import type { AppState, Product } from '../src/data/types'
import { answered, hintsKey, parseHints, withHint } from '../src/lib/hintsModel'
import { needsPackSize, packInput } from '../src/screens/StockIn/stockInModel'

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

const own = (name: string) => createProduct(shop([]), { name, category: 'pantry', price: 12, stock: 0, unit: 'packet', unitPlural: 'packets', packSize: 1 })

describe('prompt storage', () => {
  it('is kept per owner', () => {
    expect(hintsKey('abc')).toBe('stockevo-hints:abc')
  })

  it('reads back safely: missing, broken or odd values count as not asked', () => {
    expect(parseHints(null)).toEqual({})
    expect(parseHints('not json')).toEqual({})
    expect(parseHints('[1,2]')).toEqual({})
    expect(parseHints('{"pack:a":"done","pack:b":"dismissed","pack:c":"maybe","pack:d":3}')).toEqual({ 'pack:a': 'done', 'pack:b': 'dismissed' })
  })

  it('remembers a done or dismissed prompt', () => {
    const h = withHint({}, 'pack:a', 'dismissed')
    expect(answered(h, 'pack:a')).toBe(true)
    expect(answered(h, 'pack:b')).toBe(false)
  })
})

describe('asking for the pack size', () => {
  it('asks for an item of the owner’s own, bought for the first time', () => {
    const p = own('Atchar sachets')
    expect(needsPackSize(shop([p]), p, {})).toBe(true)
  })

  it('does not ask once answered or dismissed', () => {
    const p = own('Atchar sachets')
    expect(needsPackSize(shop([p]), p, { [`pack:${p.id}`]: 'done' })).toBe(false)
    expect(needsPackSize(shop([p]), p, { [`pack:${p.id}`]: 'dismissed' })).toBe(false)
  })

  it('does not ask for an item that has been received before', () => {
    const p = own('Atchar sachets')
    const s = receiveRestock(shop([p]), [{ productId: p.id, supplierId: '', qty: 5, unitPrice: 0 }], 1)
    expect(needsPackSize(s, p, {})).toBe(false)
  })

  it('does not ask when the pack is already known', () => {
    const starter = buildStarterCatalogue({ packs: ['drinks', 'kotas'], kotas: ['kota-special'] })
    const s = shop(starter)
    // Coke comes in trays of 24; a polony roll is a pack of 1, and the catalogue says so
    expect(needsPackSize(s, starter.find((p) => p.id === 'coke-can')!, {})).toBe(false)
    expect(needsPackSize(s, starter.find((p) => p.id === 'polony')!, {})).toBe(false)
    const crate = createProduct(s, { name: 'Bread rolls', category: 'bakery', price: 3, stock: 0, unit: 'roll', unitPlural: 'rolls', packSize: 6, packName: 'bag' })
    expect(needsPackSize(s, crate, {})).toBe(false)
  })

  it('asks for an item of the owner’s own from setup ("Add my own")', () => {
    const extras = buildStarterCatalogue({ packs: ['snacks'], kotas: [], extras: [{ name: 'Vetkoek', price: 5 }] })
    const vetkoek = extras.find((p) => p.name === 'Vetkoek')!
    expect(needsPackSize(shop(extras), vetkoek, {})).toBe(true)
  })

  it('never asks about things not counted on a shelf', () => {
    const starter = buildStarterCatalogue({ packs: ['airtime', 'kotas'], kotas: ['kota-special'] })
    const s = shop(starter)
    expect(needsPackSize(s, starter.find((p) => p.id === 'airtime-mtn')!, {})).toBe(false)
    expect(needsPackSize(s, starter.find((p) => p.id === 'kota-special')!, {})).toBe(false)
  })
})

describe('saving the answer', () => {
  it('saves the pack size and its name, and nothing else', () => {
    const p = { ...own('Atchar sachets'), cost: 4, stock: 7, family: undefined }
    const s = updateProduct(shop([p]), p.id, packInput(p, 20, 'Box'))
    const saved = s.products[0]
    expect(saved.packSize).toBe(20)
    expect(saved.packLabel).toBe('box of 20')
    expect({ ...saved, packSize: p.packSize, packLabel: p.packLabel }).toEqual(p)
  })
})
