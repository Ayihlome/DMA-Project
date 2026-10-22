/**
 * What Stock came in records as paid, worked out with no React in it.
 */
import type { ProductInput } from '../../data/actions'
import type { AppState, Product } from '../../data/types'
import { answered, type Hints } from '../../lib/hintsModel'

const parse = (t: string) => {
  const n = Number(t.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * What one unit cost, from what the owner typed for one step of the stepper (a
 * whole pack, or one loose unit). 0 when nothing was typed: a supplier's listed
 * price or the old cost is not what was paid this time, and 0 leaves the item's
 * average cost as it was.
 */
export function paidPerUnit(typed: string | undefined, unitsPerStep: number): number {
  const paid = parse(typed ?? '')
  if (!(paid > 0)) return 0
  return Math.round((paid / Math.max(1, unitsPerStep)) * 100) / 100
}

/**
 * Prompt 1: ask how an item is bought, on its first receipt, when nothing says.
 * A pack bigger than one is known, and so is anything from a starter pack (a 1 kg
 * polony roll really is one); an item of the owner's own at 1 has never been asked.
 * Only things counted on a shelf, and only once: answered or dismissed is final.
 */
export function needsPackSize(s: AppState, p: Product, hints: Hints): boolean {
  if (p.composite || p.untracked || p.packSize > 1) return false
  if (p.template && !p.template.startsWith('own-')) return false
  if (answered(hints, `pack:${p.id}`)) return false
  return !s.purchases.some((po) => po.status === 'delivered' && po.lines.some((l) => l.productId === p.id))
}

/** The product as it is, with the pack the owner just named: "a box of 20". */
export function packInput(p: Product, packSize: number, packName: string): ProductInput {
  return {
    name: p.name,
    detail: p.detail,
    category: p.category,
    price: p.price,
    stock: p.stock,
    unit: p.unit,
    unitPlural: p.unitPlural,
    packSize: Math.max(1, Math.round(packSize)),
    packName: packName.trim().toLowerCase() || undefined,
  }
}
