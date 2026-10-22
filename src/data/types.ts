export type CategoryKey = 'bakery' | 'dairy' | 'pantry' | 'hot' | 'beverages' | 'ingredients' | 'other'

export type RecipeLine = { productId: string; qty: number }

/** "1 potato = 5 chips": `{ name: 'chip', plural: 'chips', perUnit: 5 }`. */
export type Portion = { name: string; plural: string; perUnit: number }

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
  /**
   * Built-in Sell-grid group with its own picker: bread → brand, cold drink →
   * brand → size, airtime → network → amount. Absent = not in one.
   */
  family?: Family
  /**
   * A group the owner names themselves — "Kota", "Burgers", "Menu". Every
   * product with the same name shares one tile on the Sell grid. Mostly for
   * made-to-order food, whose recipe is what deducts the ingredients.
   */
  menu?: string
  /** First picker level: the brand, network or kota name, e.g. "Albany", "Vodacom". */
  variant?: string
  /** Second picker level, cold drinks only: "can", "500ml", "2L". */
  size?: string
  /**
   * Airtime: the amounts on offer. The amount picked at the counter becomes
   * that sale line's price, so one product per network covers every amount.
   */
  priceOptions?: number[]
  /**
   * Sold, but not stock you count — airtime and other vouchers. Never deducted,
   * never shown as low, never in a count or a restock list.
   */
  untracked?: boolean
  /**
   * How the kitchen measures this ingredient, when that is not how it is counted:
   * potatoes are counted whole but served as chips, polony is counted by the kilo
   * but served in slices. `perUnit` portions come out of one stock unit.
   *
   * Recipes are still stored in stock units, so nothing that deducts stock has to
   * know about portions; the menu editor shows and takes portions instead.
   */
  portion?: Portion
  /**
   * How many times this composite has been sold while it had no recipe. Those
   * sales deducted no ingredients, so its ingredient stock is off by that much.
   * Shown to the owner in Count stock; cleared when the item is saved with a recipe.
   */
  soldWithoutRecipe?: number
}

/**
 * The built-in groups. Made-to-order food is deliberately not one of them: a
 * shop may sell kotas, burgers, both, or call it all "Menu", so those groups
 * are named by the owner (`Product.menu`), not by the app.
 */
export type Family = 'bread' | 'airtime' | 'colddrink'

export const FAMILIES: { key: Family; label: string; icon: string }[] = [
  { key: 'bread', label: 'Bread', icon: 'bakery_dining' },
  { key: 'airtime', label: 'Airtime', icon: 'sell' },
  { key: 'colddrink', label: 'Cold drink', icon: 'local_drink' },
]

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

export type SaleLine = {
  productId: string
  qty: number
  price: number
  /** Only for lines with no product behind them — the quick-amount "Other R15". */
  label?: string
}

export type PaymentMethod = 'Cash' | 'Card'

export type Sale = {
  id: string
  at: number
  lines: SaleLine[]
  total: number
  /** Optional: sales saved before payment was recorded don't have it. */
  payment?: PaymentMethod
  /** Cash handed over, when paid in cash. Change = cashGiven - total. */
  cashGiven?: number
}

/**
 * The quick-amount keypad's line. Not a product: it deducts no stock and is
 * skipped wherever a product is looked up.
 */
export const QUICK_AMOUNT_ID = 'quick-amount'

/**
 * The owner's Sell grid, per shop. Lives in the shop state, so it is saved on
 * the phone first and travels in the Supabase backup with everything else.
 *
 * Tile ids: a product id for a single tile, `family:<key>` for a family tile,
 * or QUICK_AMOUNT_ID.
 */
export type SellGridSettings = {
  /** `null` until the owner reorders — the grid then follows best sellers. */
  order: string[] | null
  hidden: string[]
  /**
   * Product id last sold from each group tile, keyed by tile id
   * (`family:bread`, `menu:Burgers`). Shown first in that tile's picker.
   */
  lastUsed: Record<string, string>
  /** Last airtime amount sold per airtime product, so the picker can lead with it. */
  lastAmount?: Record<string, number>
  /** The one-time "Add common brands?" card on Home: answered, so it doesn't come back. */
  brandsOffer?: 'added' | 'dismissed'
}

export type PurchaseStatus = 'planned' | 'in_transit' | 'delivered' | 'cancelled'
export type PurchaseLine = {
  productId: string
  qty: number
  unitPrice: number
  /**
   * The product's cost just before this line was received, so Undo can put it
   * back. Screen state only: it is not saved, and Undo only ever follows a
   * purchase made a moment ago.
   */
  costBefore?: number
}
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
  /**
   * When onboarding was finished or skipped.
   *
   * `null` means it has not run yet and the owner goes to the onboarding
   * screen. The field being *absent* means something different: the state was
   * saved before onboarding existed, and `adoptOnboardingFlag` decides what to
   * do with it. The two cases cannot be collapsed — a brand-new account is
   * seeded with demo data, so "has sales" alone would mark it as set up.
   */
  onboardedAt?: number | null
  /**
   * When the owner last saved a stock count. The next count compares the shelf
   * with what the recipes took off since then. Absent = since setup.
   */
  lastCountAt?: number
  /**
   * When the owner last saved a count of only some items, if that was after
   * `lastCountAt`. Those items' stock was reset without moving the shop-wide date,
   * so recipe suggestions are held back until the next full count has been
   * saved. Goes once each item has its own count date (Stage 6).
   */
  partialCountAt?: number
  /** Absent on shops saved before the Sell grid existed; treated as defaults. */
  sellGrid?: SellGridSettings
  /** Day the owner goes shopping, 0 = Sunday … 6 = Saturday. Absent = Thursday. */
  restockDay?: number
  /**
   * Sales taken back with Void. Moved out of `sales` rather than flagged in
   * place, so every total, best-seller order and restock suggestion simply
   * stops counting them — nothing that reads `sales` has to know about voids.
   * Kept here so there's a record of what was voided and when.
   */
  voidedSales?: VoidedSale[]
}

export type VoidedSale = Sale & { voidedAt: number }

export const CATEGORIES: { key: CategoryKey; label: string; icon: string }[] = [
  { key: 'bakery', label: 'Bakery', icon: 'bakery_dining' },
  { key: 'dairy', label: 'Dairy & Eggs', icon: 'egg' },
  { key: 'pantry', label: 'Pantry & Grains', icon: 'grain' },
  // Kotas, burgers, plates — anything made from ingredients when it's ordered
  { key: 'hot', label: 'Made to order', icon: 'lunch_dining' },
  { key: 'beverages', label: 'Beverages', icon: 'local_bar' },
  { key: 'ingredients', label: 'Ingredients', icon: 'kitchen' },
  // Airtime vouchers and anything else that is sold but is not food
  { key: 'other', label: 'Airtime & Other', icon: 'sell' },
]

export const categoryLabel = (key: CategoryKey) => CATEGORIES.find((c) => c.key === key)?.label ?? key
