// Screen-only data: the category chips and an icon per category.
// Products come from the use cases in src/data.

export type Category = 'all' | 'bakery' | 'dairy' | 'pantry' | 'hot-food' | 'drinks'

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bakery', label: 'Bread' },
  { key: 'dairy', label: 'Milk & eggs' },
  { key: 'pantry', label: 'Groceries' },
  { key: 'hot-food', label: 'Hot food' },
  { key: 'drinks', label: 'Drinks' },
]

const CATEGORY_ICONS: Record<string, string> = {
  bakery: 'bakery_dining',
  dairy: 'egg',
  pantry: 'shopping_basket',
  'hot-food': 'lunch_dining',
  drinks: 'local_drink',
}

export const iconFor = (category: string | null) => CATEGORY_ICONS[category ?? ''] ?? 'inventory_2'
