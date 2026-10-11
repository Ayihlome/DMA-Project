import { categoryLabel, type CategoryKey } from '../../data/types'

const ICON_BY_CATEGORY: Record<string, string> = {
  bakery: 'bakery_dining',
  dairy: 'water_drop',
  hot: 'lunch_dining',
  beverages: 'local_drink',
}

/** Icon for a product's stored category. */
export const iconFor = (category: string | null | undefined) => ICON_BY_CATEGORY[category ?? ''] ?? 'shopping_basket'

/** "Dairy & Eggs" for a stored category, or '' when the product has none. */
export const categoryText = (category: string | null | undefined) => (category ? categoryLabel(category as CategoryKey) : '')

export const round2 = (n: number) => Math.round(n * 100) / 100
