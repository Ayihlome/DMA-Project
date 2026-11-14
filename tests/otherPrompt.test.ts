/**
 * Prompt 4: once "Other" (the Quick amount) has been rung up five times in a week, Home asks
 * what it was. "Not now" or "Add a product" quiets it for the rest of that week only.
 */
import { describe, expect, it } from 'vitest'
import { recordSale } from '../src/data/actions'
import { DAY } from '../src/data/inventory'
import { QUICK_AMOUNT_ID, type AppState } from '../src/data/types'
import { otherPromptFor, startOfWeek } from '../src/screens/Home/otherPrompt'

// Wednesday 21 October 2026, midday local time
const WEDNESDAY = new Date(2026, 9, 21, 12).getTime()

const shop = (): AppState => ({
  version: 1,
  products: [],
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
})

const other = (s: AppState, price: number, at: number) =>
  recordSale(s, [{ productId: QUICK_AMOUNT_ID, qty: 1, price, label: 'Other' }], {}, at).state!

const ringUp = (s: AppState, prices: number[], at = WEDNESDAY - DAY) => prices.reduce((x, p, i) => other(x, p, at + i), s)

describe('the "Other" prompt', () => {
  it('waits for the fifth "Other" this week', () => {
    expect(otherPromptFor(ringUp(shop(), [15, 15, 15, 15]), {}, WEDNESDAY)).toBeNull()
    expect(otherPromptFor(ringUp(shop(), [15, 15, 15, 15, 15]), {}, WEDNESDAY)?.count).toBe(5)
  })

  it('names the amount typed most often', () => {
    const s = ringUp(shop(), [10, 15, 15, 20, 15])
    expect(otherPromptFor(s, {}, WEDNESDAY)?.amount).toBe(15)
  })

  it('only counts this week, from Monday', () => {
    const monday = startOfWeek(WEDNESDAY)
    expect(new Date(monday).getDay()).toBe(1)
    const s = ringUp(ringUp(shop(), [15, 15, 15], monday - DAY), [15, 15], monday)
    expect(otherPromptFor(s, {}, WEDNESDAY)).toBeNull()
  })

  it('is quiet for the rest of the week once answered, and asks again next week', () => {
    const s = ringUp(shop(), [15, 15, 15, 15, 15])
    const { key } = otherPromptFor(s, {}, WEDNESDAY)!
    expect(otherPromptFor(s, { [key]: 'dismissed' }, WEDNESDAY)).toBeNull()
    expect(otherPromptFor(s, { [key]: 'done' }, WEDNESDAY + DAY)).toBeNull()

    const nextWeek = WEDNESDAY + 7 * DAY
    const again = ringUp(s, [15, 15, 15, 15, 15], nextWeek - DAY)
    expect(otherPromptFor(again, { [key]: 'dismissed' }, nextWeek)?.count).toBe(5)
  })
})
