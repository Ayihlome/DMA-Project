export type CategoryKey = 'bakery' | 'dairy' | 'pantry' | 'hot' | 'beverages' | 'ingredients'

export type RecipeLine = { productId: string; qty: number }

export type Product = {
  id: string
  name: string
  detail: string
  category: CategoryKey
  icon: string
  /** Default catalogue photo; the owner can override it per device. */
  image?: string
  sellable: boolean
  /** Selling price (sellable products only). */
  price: number
  /** Average unit cost, used for stock value. */
  cost: number
  unit: string
  unitPlural: string
  /** Quantity on hand. Ignored for composite products (derived from their recipe). */
  stock: number
  packSize: number
  packLabel: string
  composite?: boolean
  /** `null` on a composite product means the recipe has not been configured yet. */
  recipe?: RecipeLine[] | null
}

export type Supplier = { id: string; name: string; location?: string; contact?: string }

export type SupplierPrice = {
  id: string
  supplierId: string
  productId: string
  unitPrice: number
  minOrder?: number
  updatedAt: number
  history: { at: number; price: number }[]
}

export type SaleLine = { productId: string; qty: number; price: number }
export type Sale = { id: string; at: number; lines: SaleLine[]; total: number }

export type PurchaseStatus = 'planned' | 'in_transit' | 'delivered' | 'cancelled'
export type PurchaseLine = { productId: string; qty: number; unitPrice: number }
export type Purchase = {
  id: string
  at: number
  supplierId: string
  payment: 'Cash' | 'EFT' | 'Card'
  status: PurchaseStatus
  lines: PurchaseLine[]
  receivedAt?: number
}

export type SyncOp = {
  id: string
  entity: 'sale' | 'stock' | 'purchase' | 'supplier_price' | 'profile' | 'product'
  op: 'create' | 'update'
  at: number
  status: 'pending' | 'synced'
  retries: number
}

export type Profile = { ownerName: string; storeName: string; role: string; memberSince: number }

export type AppState = {
  version: 1
  products: Product[]
  suppliers: Supplier[]
  prices: SupplierPrice[]
  sales: Sale[]
  purchases: Purchase[]
  /** Supplier the owner chose on the Supply screen, per product. */
  preferred: Record<string, string>
  budget: number
  profile: Profile
  queue: SyncOp[]
  lastSyncedAt: number
}

export const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'bakery', label: 'Bakery', icon: 'bakery_dining' },
  { key: 'dairy', label: 'Dairy & Eggs', icon: 'egg' },
  { key: 'pantry', label: 'Pantry & Grains', icon: 'grain' },
  { key: 'hot', label: 'Kota & Hot Food', icon: 'lunch_dining' },
  { key: 'beverages', label: 'Beverages', icon: 'local_bar' },
  { key: 'ingredients', label: 'Ingredients', icon: 'kitchen' },
]

export const categoryLabel = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)?.label ?? key
