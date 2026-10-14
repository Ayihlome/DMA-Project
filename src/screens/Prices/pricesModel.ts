/**
 * What the Prices list shows, with no React in it.
 */
import { pricesFor, stockItems, supplierName } from '../../data/inventory'
import type { AppState, Product } from '../../data/types'

export type PriceLine = { id: string; supplierId: string; supplier: string; unitPrice: number }

export type PriceRowData = {
  product: Product
  /** Cheapest first. Empty when nobody has priced it yet. */
  prices: PriceLine[]
}

/**
 * One row per thing the shop buys: anything with a shelf count. Kotas and
 * other made-to-order items are built, not bought, and airtime isn't stock, so
 * neither appears. Alphabetical, so an item is always where you expect it.
 */
export function priceRows(s: AppState, query = ''): PriceRowData[] {
  const q = query.trim().toLowerCase()
  return stockItems(s)
    .filter((p) => !q || p.name.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((product) => ({
      product,
      prices: pricesFor(s, product.id).map((x) => ({
        id: x.id,
        supplierId: x.supplierId,
        supplier: supplierName(s, x.supplierId),
        unitPrice: x.unitPrice,
      })),
    }))
}

/** "per loaf", "per slice" — the unit a price is quoted in. */
export const perUnit = (p: Product) => `per ${p.unit}`

/**
 * Turns what the owner typed into a per-unit price. Suppliers quote by the
 * pack ("R180 a tray"), the app compares per unit, so a pack price is divided
 * by the pack size.
 */
export function toUnitPrice(amount: number, per: 'unit' | 'pack', packSize: number) {
  const unit = per === 'pack' ? amount / Math.max(1, packSize) : amount
  return Math.round(unit * 100) / 100
}
