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

/** A cold drink's name from its brand and size: "Coke 500ml". Empty until there is a brand. */
export function drinkName(brand: string, size: string): string {
  const b = brand.trim()
  return b ? `${b} ${size.trim()}`.trim() : ''
}

/**
 * The name after the brand or size changed. It follows them while the name is
 * empty or still the one the app filled in (`lastAuto`), so the name, brand and
 * size can't drift apart; a name the owner typed is never overwritten.
 */
export function autoName(name: string, lastAuto: string, brand: string, size: string): string {
  return !name.trim() || name === lastAuto ? drinkName(brand, size) : name
}
