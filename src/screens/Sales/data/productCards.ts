import { colors } from '../../../theme/theme'
import { PRODUCTS as SAMPLE, type Product } from './salesData'
import { categoryText } from '../../shared/productPresentation'

/** A product as getSellableProducts answers (see the contract in useCases/getSellableProducts.js). */
export type SellableProduct = {
  id: string
  name: string
  unit: string
  category: string | null
  selling_price: number
  pack_size: number
  is_composite: number | boolean
  stockOnHand: number
  availableQuantity: number
  hasRecipe: boolean
}

/** The Sales screen's "Kota" pill is stored as category "hot". */
export const storedCategory = (pill: string) => (pill === 'all' ? undefined : pill === 'kota' ? 'hot' : pill)

// Products have no photo in the database yet, so each category borrows a sample picture.
const pic = (id: string) => SAMPLE.find(p => p.id === id)!.uri
const IMAGE_BY_CATEGORY: Record<string, string> = {
  bakery: pic('bread'),
  dairy: pic('milk'),
  beverages: pic('coke'),
  hot: pic('kota'),
}
const IMAGE_FALLBACK = pic('eggs')

/** How many of this product can go in the cart right now. */
export const maxSellable = (p: SellableProduct) => p.availableQuantity

/** Turns a product from the database into the card the grid draws. */
export function toCard(p: SellableProduct): Product {
  const base = {
    id: p.id,
    name: p.name,
    category: categoryText(p.category) || p.unit,
    price: p.selling_price,
    uri: IMAGE_BY_CATEGORY[p.category ?? ''] ?? IMAGE_FALLBACK,
  }
  if (p.is_composite) {
    if (!p.hasRecipe) {
      return { ...base, stockLabel: '', disabled: true, disabledReason: 'Recipe missing - cannot deduct stock' }
    }
    if (p.availableQuantity <= 0) {
      return { ...base, stockLabel: '', disabled: true, disabledReason: 'Not enough ingredients', hasRecipe: true }
    }
    return { ...base, stockLabel: 'Recipe linked', badge: 'Recipe linked', badgeBg: colors.accentTint, badgeText: colors.primary, hasRecipe: true }
  }
  if (p.stockOnHand <= 0) {
    return { ...base, stockLabel: '', disabled: true, disabledReason: 'Out of stock' }
  }
  const plenty = p.stockOnHand >= 10
  return {
    ...base,
    stockLabel: `${p.stockOnHand} left`,
    badge: `${p.stockOnHand} left`,
    badgeBg: plenty ? colors.secondary : colors.surfaceContainerHighest,
    badgeText: plenty ? colors.onSecondary : colors.onSurface,
  }
}
