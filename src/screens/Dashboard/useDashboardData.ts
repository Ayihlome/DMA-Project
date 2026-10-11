import { useStore } from '../../store'
import { dashboardKpis, healthOf, available, recommendations } from '../../data/inventory'
import type { LowStockItem, StockLevel } from './data/dashboardData'

export function useDashboardData() {
  const { state } = useStore()
  const kpis = dashboardKpis(state)

  const SUMMARY = {
    salesToday: kpis.salesToday,
    salesYesterday: kpis.salesYesterday,
    stockValue: kpis.stockValue,
    itemCount: kpis.itemCount,
    nextRestock: Number.isFinite(kpis.soonest) && kpis.soonest < 9999
      ? `${Math.round(kpis.soonest)} days`
      : 'Well stocked',
  }

  const LOW_STOCK: LowStockItem[] = kpis.attention.map((p) => {
    const h = healthOf(state, p)
    const qty = available(state, p)
    const level: StockLevel = h === 'out' || h === 'critical' ? 'out-soon' : 'low'
    return {
      id: p.id,
      name: p.name,
      size: p.detail,
      left: qty,
      unit: qty === 1 ? p.unit : p.unitPlural,
      level,
      icon: p.icon,
    }
  })

  const RESTOCK_ITEMS = recommendations(state)

  return { SUMMARY, LOW_STOCK, RESTOCK_ITEMS }
}
