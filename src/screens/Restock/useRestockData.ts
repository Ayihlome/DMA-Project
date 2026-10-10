import { useStore } from '../../store'
import { recommendations, supplierName } from '../../data/inventory'
import type { RestockItem } from './data/restockData'

export function useRestockData() {
  const store = useStore()
  const { state } = store
  const recs = recommendations(state)

  const ITEMS: RestockItem[] = recs.map((rec, i) => {
    const packCount = Math.max(1, Math.ceil(rec.qty / rec.product.packSize))
    const packs = `${packCount} ${rec.product.packLabel.startsWith('single') ? 'units' : `pack${packCount !== 1 ? 's' : ''}`}`
    const suppliers = rec.options.length > 0
      ? rec.options.map((o) => ({ name: supplierName(state, o.supplierId), unitPrice: o.unitPrice }))
      : [{ name: 'No price saved', unitPrice: rec.unitPrice }]
    return {
      id: i,
      name: `${rec.product.name}`,
      qty: rec.qty,
      unit: rec.product.unitPlural,
      packs,
      level: rec.health === 'out' || rec.health === 'critical' ? 'out-soon' as const : 'low' as const,
      suppliers,
      why: rec.reasons.join(' '),
    }
  })

  // Regular recurring budget (cold drinks, airtime, etc.) — not yet tracked in the store
  const REGULAR_STOCK = 0

  function saveList(checked: Set<number>, supplierFor: Record<number, number>) {
    const lines = [...checked].flatMap((idx) => {
      const rec = recs[idx]
      if (!rec) return []
      const option = rec.options[supplierFor[idx] ?? 0]
      if (!option) return []
      return [{ productId: rec.product.id, qty: rec.qty, unitPrice: option.unitPrice, supplierId: option.supplierId }]
    })
    if (lines.length > 0) store.createOrderList(lines)
  }

  return { ITEMS, REGULAR_STOCK, saveList }
}
