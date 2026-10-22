/**
 * The product form's derived fields, worked out with no React in it.
 */
import type { CategoryKey } from '../../data/types'
import { pluralOf } from '../../lib/format'

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

/** The hint under the unit field, in the owner's own unit: "per can" and "3 cans left", not always loaves. */
export function unitHint(unit: string): string {
  const u = unit.trim().toLowerCase()
  if (!u) return 'One word, like can or loaf. It shows as “per can” and “3 cans left”.'
  return `One word. It shows as “per ${u}” and “3 ${pluralOf(u)} left”.`
}

export type SummaryInput = {
  name: string
  /** What one of it is: loaf, can, kg. */
  unit: string
  /** Selling price of one; absent for an ingredient, which isn't sold on its own. */
  price?: number
  /** How many come in what the shop buys; 1 = bought one at a time. */
  packSize: number
  /** What that is called: crate, tray, box. */
  packName?: string
  /** What the shop pays for one pack (one item when packSize is 1); absent when not typed. */
  packCost?: number
}

/**
 * The sentence under the product and ingredient forms: the answers read back in
 * shop words ("crates of 10 for R140, which is R14 a loaf"), so a wrong number is
 * obvious before saving. It only repeats what was typed; with no cost it says
 * nothing about what is kept. `money` formats rand (theme/tokens' money()).
 */
export function formSummary(f: SummaryInput, money: (n: number) => string): string[] {
  const name = f.name.trim()
  if (!name) return []
  const unit = f.unit.trim().toLowerCase() || 'item'
  const a = /^[aeiou]/.test(unit) ? 'an' : 'a'
  const sells = f.price !== undefined
  const cost = f.packCost !== undefined && f.packCost > 0 ? f.packCost : 0
  const size = Math.max(1, f.packSize)
  const lines: string[] = []

  if (sells && f.price! > 0) lines.push(`You sell ${name} at ${money(f.price!)} ${a} ${unit}.`)

  const subject = sells ? 'You buy it' : `You buy ${name}`
  if (size > 1) {
    const packs = pluralOf(f.packName?.trim().toLowerCase() || 'pack')
    lines.push(`${subject} in ${packs} of ${size}${cost ? ` for ${money(cost)}, which is ${money(cost / size)} ${a} ${unit}` : ''}.`)
  } else {
    lines.push(`${subject} one ${unit} at a time${cost ? ` for ${money(cost)}` : ''}.`)
  }

  if (sells) {
    if (cost && f.price! > 0) {
      const keep = f.price! - cost / size
      lines.push(keep >= 0 ? `You keep about ${money(keep)} ${a} ${unit}.` : `You lose about ${money(-keep)} on each ${unit}.`)
    } else {
      lines.push('What you keep shows once you add what you pay.')
    }
  }
  return lines
}
