/**
 * Home's "Other" prompt, worked out with no React in it.
 */
import { DAY, startOfToday } from '../../data/inventory'
import { QUICK_AMOUNT_ID, type AppState } from '../../data/types'
import { answered, type Hints } from '../../lib/hintsModel'

/** Quick amount used this many times in a week before Home asks what it was. */
export const OTHER_PROMPT_AFTER = 5

/** Monday 00:00 of this week, local time. */
export function startOfWeek(now = Date.now()) {
  const today = startOfToday(now)
  const sinceMonday = (new Date(today).getDay() + 6) % 7
  return today - sinceMonday * DAY
}

/**
 * Prompt 4: the Quick amount ("Other") was used often this week. Those sales
 * take no stock and have no cost, so Home suggests adding what they were.
 * Asked once a week at most: "Not now" or "Add a product" quiets it until
 * next Monday, and it comes back only if the shop keeps leaning on it.
 *
 * `amount` is the price typed most often, to jog the owner's memory.
 */
export function otherPromptFor(
  s: AppState,
  hints: Hints,
  now = Date.now(),
): { key: string; count: number; amount: number } | null {
  const week = startOfWeek(now)
  // The week's start as a number: an ISO date would be in UTC and read as Sunday here
  const key = `other:${week}`
  if (answered(hints, key)) return null

  let count = 0
  const byAmount = new Map<number, number>()
  for (const sale of s.sales) {
    if (sale.at < week) continue
    for (const l of sale.lines) {
      if (l.productId !== QUICK_AMOUNT_ID) continue
      count += l.qty
      byAmount.set(l.price, (byAmount.get(l.price) ?? 0) + l.qty)
    }
  }
  if (count < OTHER_PROMPT_AFTER) return null
  const [amount] = [...byAmount].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]
  return { key, count, amount }
}
