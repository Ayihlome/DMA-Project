/**
 * Checks recipes against a stock count.
 *
 * Recipe amounts start as guesses — a quarter loaf, 150 g of chips — and a
 * wrong guess quietly drifts every ingredient count. A count is the one moment
 * the app learns the truth: if the shelf has less chips than the recipes say
 * should be left, the kotas probably use more than the recipe says.
 *
 * Only shortfalls are suggested. More on the shelf than expected usually means
 * a delivery nobody recorded, not a recipe that is too generous, and a count
 * below zero has no trustworthy starting point. Waste and theft look exactly
 * like a bigger portion, so this only ever suggests; the owner decides.
 */
import { productById } from './inventory'
import type { AppState, Product, RecipeLine } from './types'

/** Below this many food sales since the last count the numbers are too thin to say anything. */
export const MIN_SERVINGS = 10
/** Shortfalls smaller than this share of what the recipes used are counting noise. */
export const MIN_GAP = 0.1
/** More than twice what the recipes say is waste or a missed sale, not a portion size. */
export const MAX_FACTOR = 2

export type RecipeChange = { menuId: string; menuName: string; from: number; to: number }

export type RecipeSuggestion = {
  ingredient: Product
  /** What the app thought was on the shelf. */
  expected: number
  counted: number
  /** What the recipes took off since the last count. */
  recipeUsed: number
  /** Menu items sold since the last count that use this ingredient. */
  servings: number
  /** How much more the recipes should take: 1.25 = a quarter more. */
  factor: number
  changes: RecipeChange[]
}

/** When the current stretch of numbers started: the last count, or setup. */
export const countBaseline = (s: AppState) => s.lastCountAt ?? s.onboardedAt ?? 0

/**
 * Weights and volumes to the gram or millilitre; pieces and slices to a tenth (an average,
 * some get two). A sized ingredient rounds in its own measure: whole chips, whole slices.
 */
function roundQty(p: Product, n: number) {
  if (p.portion) {
    const per = p.portion.perUnit
    return Math.round((Math.max(1, Math.round(n * per)) / per) * 10000) / 10000
  }
  const step = ['kg', 'l', 'L'].includes(p.unit) ? 0.005 : 0.1
  // Never rounds down to nothing: an ingredient in the recipe stays in it
  return Math.round(Math.max(step, Math.round(n / step) * step) * 1000) / 1000
}

/**
 * Suggestions for a count the owner is about to save. `counts` is what they
 * counted, by product id; anything not in it was not counted.
 */
export function recipeSuggestions(s: AppState, counts: Record<string, number>): RecipeSuggestion[] {
  const since = countBaseline(s)
  // A partial count since the last full one reset some items' stock without
  // moving `since`, so a shortfall would be spread over sales from before it and
  // suggest too small a change. Held back, for every item, until a full count
  // has been saved; per-item count dates (Stage 6) will lift this.
  if (s.partialCountAt !== undefined && s.partialCountAt > since) return []
  const used = new Map<string, number>()
  const servings = new Map<string, number>()

  for (const sale of s.sales) {
    if (sale.at <= since) continue
    for (const l of sale.lines) {
      const p = productById(s, l.productId)
      if (!p?.composite || !p.recipe?.length) continue
      for (const r of p.recipe) {
        used.set(r.productId, (used.get(r.productId) ?? 0) + r.qty * l.qty)
        servings.set(r.productId, (servings.get(r.productId) ?? 0) + l.qty)
      }
    }
  }

  const menu = s.products.filter((p) => p.composite && p.sellable && p.recipe?.length)
  const out: RecipeSuggestion[] = []

  for (const [id, recipeUsed] of used) {
    const ingredient = productById(s, id)
    const counted = counts[id]
    if (!ingredient || counted === undefined || !Number.isFinite(counted)) continue
    const expected = ingredient.stock
    if (expected < 0 || (servings.get(id) ?? 0) < MIN_SERVINGS || recipeUsed <= 0) continue

    const short = expected - counted
    if (short <= recipeUsed * MIN_GAP) continue
    const factor = (recipeUsed + short) / recipeUsed
    if (factor > MAX_FACTOR) continue

    const changes = menu.flatMap((m) =>
      (m.recipe ?? [])
        .filter((r) => r.productId === id)
        .map((r) => ({ menuId: m.id, menuName: m.name, from: r.qty, to: roundQty(ingredient, r.qty * factor) }))
        .filter((c) => c.to !== c.from),
    )
    if (changes.length) {
      out.push({ ingredient, expected, counted, recipeUsed, servings: servings.get(id) ?? 0, factor, changes })
    }
  }
  return out.sort((a, b) => b.factor - a.factor)
}

/** One menu item's recipe with a suggestion's new amount for that ingredient. */
export function withChange(recipe: RecipeLine[], ingredientId: string, to: number): RecipeLine[] {
  return recipe.map((r) => (r.productId === ingredientId ? { ...r, qty: to } : r))
}
