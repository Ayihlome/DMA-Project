/**
 * What Menu (and Home's recipe prompt) show about a recipe, worked out with no React in it.
 */
import type { AppState, Product } from '../../data/types'
import { answered, type Hints } from '../../lib/hintsModel'

/** The status line under a made-to-order item, or null when there is nothing to say. */
export function recipeStatusLabel(p: Product): string | null {
  return p.recipeChecked === false ? 'Standard recipe, not checked by you yet' : null
}

/** Sold this many times with no recipe before Home asks for its ingredients. */
export const RECIPE_PROMPT_AFTER = 3

/**
 * Prompt 2: the food item to ask about on Home, or null. One sold three times
 * with no recipe (its ingredients never came off stock), most-sold first, one
 * at a time; once answered or dismissed it never comes back.
 */
export function recipePromptFor(s: AppState, hints: Hints): Product | null {
  return (
    s.products
      .filter(
        (p) =>
          p.composite &&
          p.sellable &&
          !p.recipe?.length &&
          (p.soldWithoutRecipe ?? 0) >= RECIPE_PROMPT_AFTER &&
          !answered(hints, `recipe:${p.id}`),
      )
      .sort((a, b) => (b.soldWithoutRecipe ?? 0) - (a.soldWithoutRecipe ?? 0))[0] ?? null
  )
}
