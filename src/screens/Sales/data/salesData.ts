// Sample data until the screen reads from Supabase

export type Category = 'all' | 'bakery' | 'dairy' | 'pantry' | 'hot-food' | 'drinks'

export interface Product {
  id: string
  name: string
  size: string
  category: Exclude<Category, 'all'>
  price: number
  stock: number | null // null = made to order from a recipe
  icon: string
  recipe?: string // ingredients deducted when sold
  needsRecipe?: boolean // can't be sold until its recipe is set up
}

export const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bakery', label: 'Bread' },
  { key: 'dairy', label: 'Milk & eggs' },
  { key: 'pantry', label: 'Groceries' },
  { key: 'hot-food', label: 'Hot food' },
  { key: 'drinks', label: 'Drinks' },
]

export const PRODUCTS: Product[] = [
  { id: 'bread', name: 'White bread', size: '700g', category: 'bakery', price: 17, stock: 18, icon: 'bakery_dining' },
  { id: 'milk', name: 'Full cream milk', size: '1L', category: 'dairy', price: 15.5, stock: 9, icon: 'water_drop' },
  { id: 'eggs', name: 'Eggs', size: '6 pack', category: 'dairy', price: 22, stock: 14, icon: 'egg' },
  { id: 'coke', name: 'Coca-Cola', size: '330ml can', category: 'drinks', price: 13, stock: 32, icon: 'local_drink' },
  { id: 'maize', name: 'Maize meal', size: '2.5kg', category: 'pantry', price: 42, stock: 6, icon: 'shopping_basket' },
  {
    id: 'kota', name: 'Kota special', size: 'Chips, polony, cheese', category: 'hot-food', price: 35, stock: null, icon: 'lunch_dining',
    recipe: 'Quarter loaf, 50g polony, 1 slice cheese, 100g chips',
  },
  { id: 'russian', name: 'Russian and chips', size: 'Hot food', category: 'hot-food', price: 28, stock: null, icon: 'lunch_dining', needsRecipe: true },
]
