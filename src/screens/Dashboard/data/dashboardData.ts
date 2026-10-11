// Shape contract fulfilled by useDashboardData()

export type StockLevel = 'out-soon' | 'low'

export interface LowStockItem {
  id: string
  name: string
  size: string
  left: number
  unit: string
  level: StockLevel
  icon: string
}
