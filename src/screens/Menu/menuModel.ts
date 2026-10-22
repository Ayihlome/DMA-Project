/**
 * What Menu shows about a recipe, worked out with no React in it.
 */
import type { Product } from '../../data/types'

/** The status line under a made-to-order item, or null when there is nothing to say. */
export function recipeStatusLabel(p: Product): string | null {
  return p.recipeChecked === false ? 'Standard recipe, not checked by you yet' : null
}
