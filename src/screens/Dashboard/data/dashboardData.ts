// Sample data until the screen reads from Supabase

export const SUMMARY = {
  salesToday: 1420,
  salesYesterday: 1245,
  stockValue: 8950,
  itemCount: 112,
  nextRestock: 'Tuesday',
}

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

export const LOW_STOCK: LowStockItem[] = [
  { id: '1', name: 'White bread', size: '700g', left: 2, unit: 'loaves', level: 'out-soon', icon: 'bakery_dining' },
  { id: '2', name: 'Full cream milk', size: '1L sachet', left: 4, unit: 'sachets', level: 'out-soon', icon: 'water_drop' },
  { id: '3', name: 'Sunflower oil', size: '750ml', left: 5, unit: 'bottles', level: 'low', icon: 'shopping_basket' },
  { id: '4', name: 'Maize meal', size: '2.5kg', left: 6, unit: 'bags', level: 'low', icon: 'shopping_basket' },
]
