// Shape contract fulfilled by useRestockData()

export interface SupplierOption {
  name: string
  unitPrice: number
}

export interface RestockItem {
  id: number
  name: string
  qty: number
  unit: string
  packs: string
  level: 'out-soon' | 'low'
  suppliers: SupplierOption[] // cheapest first
  why: string
}
