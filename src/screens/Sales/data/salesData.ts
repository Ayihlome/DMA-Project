// Category pill labels (static UI config) + the shape contract fulfilled by useSalesData()

export type Category = 'all' | 'bakery' | 'dairy' | 'pantry' | 'kota' | 'beverages'

export interface Product {
  id: string
  name: string
  category: string
  stockLabel: string
  price: number
  uri: string
  badge?: string
  badgeBg?: string
  badgeText?: string
  disabled?: boolean
  disabledReason?: string
  hasRecipe?: boolean
}

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'dairy', label: 'Dairy & Eggs' },
  { key: 'pantry', label: 'Pantry & Grains' },
  { key: 'kota', label: 'Kota & Hot Food' },
  { key: 'beverages', label: 'Beverages' },
]
