/**
 * What Stock came in records as paid, worked out with no React in it.
 */

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
