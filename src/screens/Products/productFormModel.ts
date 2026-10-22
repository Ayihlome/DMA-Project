/**
 * The product form's derived fields, worked out with no React in it.
 */
import type { CategoryKey } from '../../data/types'

export type SellGroup = 'none' | 'bread' | 'colddrink'

/**
 * The category, which the form no longer asks for: "Shows on Sell under" already
 * says where an item belongs. Bread and cold drinks follow their group; anything
 * else keeps the category it has, and a new item gets the everyday one. It is
 * still kept because the icon and the exported report read it.
 */
export function categoryFor(existing: CategoryKey | undefined, group: SellGroup): CategoryKey {
  if (group === 'bread') return 'bakery'
  if (group === 'colddrink') return 'beverages'
  return existing ?? 'pantry'
}
