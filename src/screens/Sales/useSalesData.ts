import { useStore } from '../../store'
import { healthOf, available } from '../../data/inventory'
import { categoryLabel } from '../../data/types'
import { colors } from '../../theme/theme'
import type { Product } from './data/salesData'

export function useSalesData() {
  const { state, photos } = useStore()

  const PRODUCTS: Product[] = state.products
    .filter((p) => p.sellable)
    .map((p) => {
      const h = healthOf(state, p)
      const qty = available(state, p)
      const noRecipe = p.composite && !p.recipe?.length
      const outOfStock = h === 'out'
      const disabled = noRecipe || outOfStock

      let badge: string | undefined
      let badgeBg: string | undefined
      let badgeText: string | undefined

      if (noRecipe) {
        badge = 'Recipe missing'
        badgeBg = colors.accentTint
        badgeText = colors.primary
      } else if (outOfStock) {
        badge = 'Out of stock'
        badgeBg = colors.errorDefault
        badgeText = '#fff'
      } else if (h === 'critical') {
        badge = `${qty} left`
        badgeBg = colors.errorDefault
        badgeText = '#fff'
      } else if (h === 'low') {
        badge = `${qty} left`
        badgeBg = colors.surfaceContainerHighest
        badgeText = colors.onSurface
      } else {
        badge = 'In stock'
        badgeBg = colors.secondary
        badgeText = colors.onSecondary
      }

      return {
        id: p.id,
        name: p.name,
        category: p.detail || categoryLabel(p.category),
        stockLabel: `${qty} left`,
        price: p.price,
        uri: photos[p.id] ?? p.image ?? '',
        badge,
        badgeBg,
        badgeText,
        disabled,
        disabledReason: noRecipe
          ? 'Recipe missing - cannot deduct stock'
          : outOfStock
            ? 'Out of stock'
            : undefined,
        hasRecipe: !!p.composite && !!p.recipe?.length,
      }
    })

  return { PRODUCTS }
}
