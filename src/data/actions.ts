/**
 * Pure state transitions shared by the web and mobile stores. Each function takes the
 * current state and returns the next one (including its sync-queue entry), so both apps
 * apply exactly the same business rules; only persistence differs per platform.
 */
import type { AppState, CategoryKey, Family, PaymentMethod, Portion, Product, Profile, Purchase, PurchaseLine, RecipeLine, SaleLine, SellGridSettings, SyncOp } from './types'
import { QUICK_AMOUNT_ID } from './types'
import { deductionsFor, productById, recipeCost, stockItems } from './inventory'
import { buildStarterCatalogue, type StarterSelection } from './starterPacks'
import type { BackupStatus } from '../lib/cloudBackup'

export type Result = { ok: true; message: string } | { ok: false; message: string }

/**
 * A sale as the counter builds it. `price` is honoured only where the price
 * really is chosen at the counter — an airtime amount, or the quick-amount
 * keypad — and otherwise the catalogue price wins, so a stale price in a
 * parked sale can't undercharge.
 */
export type SaleInput = { productId: string; qty: number; price?: number; label?: string }[]
export type SaleMeta = { payment?: PaymentMethod; cashGiven?: number }
export type OrderInput = (PurchaseLine & { supplierId: string })[]
export type SupplierPriceInput = { productId: string; supplierName: string; unitPrice: number; minOrder?: number; location?: string }
export type ProductInput = {
  name: string
  detail?: string
  category: CategoryKey
  price: number
  stock: number
  unit: string
  unitPlural: string
  packSize: number
  /** What the pack is called — "tray", "crate". Absent keeps the current name. */
  packName?: string
  /** What one unit costs the shop. Absent keeps the current cost (0 for a new product). */
  cost?: number
  /**
   * The Sell tile it sits under: bread or cold drink, with its brand and (cold
   * drinks) size. `null` takes it out of a group; absent keeps what it has.
   */
  family?: Exclude<Family, 'airtime'> | null
  variant?: string
  size?: string
}

/** Group, brand and size from the form, or nothing when the product stands on its own. */
function groupFields(input: ProductInput): Pick<Product, 'family' | 'variant' | 'size'> {
  if (!input.family) return {}
  const variant = input.variant?.trim() || input.name.trim()
  const size = input.family === 'colddrink' ? input.size?.trim() || undefined : undefined
  return { family: input.family, variant, ...(size ? { size } : {}) }
}

/** The API both store providers expose through `useStore()`. */
export type StoreApi = {
  state: AppState
  photos: Record<string, string>
  online: boolean
  pending: number
  recordSale: (lines: SaleInput, meta?: SaleMeta) => Result
  /** Merges into the shop's Sell grid settings (order, hidden tiles, last used). */
  updateSellGrid: (patch: Partial<SellGridSettings>) => void
  /** Creates (no id) or edits a made-to-order item: name, price, group and recipe. */
  saveMenuItem: (input: MenuItemInput, id?: string) => Product
  /** Takes an item off the menu. Kept in the catalogue so old sales still name it. */
  removeMenuItem: (id: string) => void
  /** A new stock item to use as an ingredient: counted and bought, never sold. */
  addIngredient: (input: IngredientInput) => Product
  /** How the kitchen measures an ingredient ("1 potato = 5 chips"); null clears it. */
  setPortion: (productId: string, portion: Portion | null) => void
  createOrderList: (lines: OrderInput) => Purchase[]
  receivePurchase: (id: string) => void
  /** Records a shopping trip as delivered purchases and adds the stock. Returns the purchase ids, for Undo. */
  receiveRestock: (lines: OrderInput) => string[]
  /** Takes a recorded trip back out. */
  undoRestock: (purchaseIds: string[]) => void
  /** The day the owner goes shopping, 0 = Sunday … 6 = Saturday. */
  setRestockDay: (day: number) => void
  /** Takes a recorded sale back and returns its stock. */
  voidSale: (saleId: string) => void
  cancelPurchase: (id: string) => void
  addProduct: (input: ProductInput) => Product
  updateProduct: (id: string, input: ProductInput) => void
  upsertSupplierPrice: (input: SupplierPriceInput) => void
  setPreferredSupplier: (productId: string, supplierId: string) => void
  setBudget: (n: number) => void
  updateProfile: (p: Partial<Profile>) => void
  /** Finishes onboarding: replaces the demo catalogue with the chosen starter packs. */
  finishOnboarding: (sel: StarterSelection, profile?: Partial<Profile>, counts?: StockCounts) => void
  /** Leaves whatever is in the app alone and stops asking. */
  skipOnboarding: (profile?: Partial<Profile>) => void
  /** Sets stock on hand for the given products, from a count the owner just did. */
  setStockCounts: (counts: StockCounts) => void
  /** Whether the last snapshot upload succeeded. Never optimistic. */
  backupStatus: BackupStatus
  /** Uploads a snapshot now instead of waiting for the debounce. */
  backUpNow: () => void
  /** Async so the mobile store can await device storage; the web store resolves immediately. */
  setPhoto: (productId: string, dataUrl: string) => Promise<Result>
  removePhoto: (productId: string) => void
  resetDemoData: () => void
}

export type MenuItemInput = {
  name: string
  price: number
  /** The group it sits in on Sell — "Kota", "Burgers", "Menu". */
  menu: string
  recipe: RecipeLine[]
}

export type IngredientInput = {
  name: string
  unit: string
  unitPlural?: string
  /** How many units come in what you buy, e.g. 24 slices in a pack. */
  packSize: number
  packLabel?: string
  /** Cost of one unit, for working out what a menu item costs to make. */
  cost?: number
  /** How the kitchen measures it, when not in the unit it is counted in. */
  portion?: Portion
}

/**
 * A portion from what the owner typed: "chips" (or "chip") and 5 → chip / chips, 5 per unit.
 * Null when either is missing, which means "measured in the unit it is counted in".
 */
export function makePortion(servedAs: string, perUnit: number): Portion | null {
  const served = servedAs.trim().toLowerCase()
  if (!served || !(perUnit > 0)) return null
  return { name: served.replace(/s$/, '') || served, plural: served.endsWith('s') ? served : `${served}s`, perUnit }
}

/** Stock units → what the kitchen calls them: 2 potatoes → 10 chips. Unchanged without a portion. */
export const toPortions = (p: Product, qty: number) => (p.portion ? qty * p.portion.perUnit : qty)
/** Kitchen measure → stock units: 10 chips → 2 potatoes. */
export const fromPortions = (p: Product, n: number) => (p.portion ? n / p.portion.perUnit : n)

/**
 * Sets (or clears, with null) how an ingredient is measured in the kitchen.
 *
 * What each menu item gets stays the same in portions: a kota keeps its 10
 * chips when the owner says a potato gives 6 chips instead of 5, and the stock
 * it takes off changes instead. That is the point of sizing an ingredient once.
 */
export function setPortion(s: AppState, productId: string, portion: Portion | null): AppState {
  const p = productById(s, productId)
  if (!p) return s
  const clean = portion && portion.perUnit > 0 && portion.name.trim() ? { ...portion, name: portion.name.trim(), plural: portion.plural.trim() || `${portion.name.trim()}s` } : null
  const oldPer = p.portion?.perUnit ?? 1
  const newPer = clean?.perUnit ?? 1
  return queued(
    {
      ...s,
      products: recosted(
        s.products.map((x) => {
          if (x.id === productId) {
            const { portion: _old, ...rest } = x
            return clean ? { ...rest, portion: clean } : rest
          }
          if (!x.composite || !x.recipe?.some((l) => l.productId === productId) || oldPer === newPer) return x
          return {
            ...x,
            recipe: x.recipe.map((l) => (l.productId === productId ? { ...l, qty: Math.round(((l.qty * oldPer) / newPer) * 10000) / 10000 } : l)),
          }
        }),
      ),
    },
    'product',
    'update',
  )
}

export const STATE_KEY = 'stockevo-state-v1'
export const PHOTO_KEY = 'stockevo-photos'
/** Which account the state on this device belongs to, so a second owner signing in here never inherits it. */
export const OWNER_KEY = 'stockevo-owner'
/** How long to wait after a change before uploading a snapshot. */
export const BACKUP_DEBOUNCE_MS = 5000

export const uid = () => Math.random().toString(36).slice(2, 10)

function queued(s: AppState, entity: SyncOp['entity'], kind: SyncOp['op'] = 'create', now = Date.now()): AppState {
  return { ...s, queue: [...s.queue, { id: uid(), entity, op: kind, at: now, status: 'pending', retries: 0 }] }
}

export const pendingCount = (s: AppState) => s.queue.filter((q) => q.status === 'pending').length

export function isValidState(x: unknown): x is AppState {
  return !!x && typeof x === 'object' && (x as AppState).version === 1
}

/** Called once a snapshot upload has actually succeeded, never on a timer. */
export function markBackedUp(s: AppState, now = Date.now()): AppState {
  return {
    ...s,
    queue: s.queue.map((q) => (q.status === 'pending' ? { ...q, status: 'synced' as const } : q)).slice(-50),
    lastSyncedAt: now,
  }
}

/** FR3 + BR1 + BR2: validates the sale, then applies it and every stock deduction in one step. */
/**
 * Records a sale. Never refuses one because of stock: a spaza can't turn a
 * customer away because the app's count is wrong. Stock may go negative, which
 * is what flags an item for counting. A kota with no recipe still sells — it
 * just deducts nothing, and is marked so the owner sees it in Count stock.
 */
export function recordSale(s: AppState, lines: SaleInput, meta: SaleMeta = {}, now = Date.now()): Result & { state?: AppState } {
  const clean = lines.filter((l) => l.qty > 0)
  if (!clean.length) return { ok: false, message: 'Add at least one item to the sale.' }

  const saleLines: SaleLine[] = []
  for (const l of clean) {
    if (l.productId === QUICK_AMOUNT_ID) {
      if (!(l.price && l.price > 0)) return { ok: false, message: 'Enter an amount above R0.' }
      saleLines.push({ productId: QUICK_AMOUNT_ID, qty: l.qty, price: l.price, label: l.label || 'Other' })
      continue
    }
    const p = productById(s, l.productId)
    if (!p) return { ok: false, message: 'One of the items is no longer in the catalogue.' }
    const priceAtCounter = p.priceOptions?.length && l.price && l.price > 0 ? l.price : undefined
    saleLines.push({ productId: p.id, qty: l.qty, price: priceAtCounter ?? p.price })
  }

  // Composites without a recipe deduct nothing here (deductionsFor skips an
  // empty recipe), so count how often each was sold that way
  const unrecipied = new Map<string, number>()
  for (const l of saleLines) {
    const p = productById(s, l.productId)
    if (p?.composite && !p.recipe?.length) unrecipied.set(p.id, (unrecipied.get(p.id) ?? 0) + l.qty)
  }

  const deductions = deductionsFor(s, saleLines)
  const total = Math.round(saleLines.reduce((t, l) => t + l.qty * l.price, 0) * 100) / 100
  const next: AppState = {
    ...s,
    products: s.products.map((p) => {
      let out = p
      if (deductions.has(p.id)) out = { ...out, stock: Math.round((p.stock - deductions.get(p.id)!) * 1000) / 1000 }
      if (unrecipied.has(p.id)) out = { ...out, soldWithoutRecipe: (p.soldWithoutRecipe ?? 0) + unrecipied.get(p.id)! }
      return out
    }),
    sales: [
      ...s.sales,
      {
        id: `sale-${uid()}`,
        at: now,
        lines: saleLines,
        total,
        ...(meta.payment ? { payment: meta.payment } : {}),
        ...(meta.payment === 'Cash' && meta.cashGiven != null ? { cashGiven: meta.cashGiven } : {}),
      },
    ],
  }
  return { ok: true, message: `Sale of R${total.toFixed(2)} recorded.`, state: queued(next, 'sale', 'create', now) }
}

export const DEFAULT_SELL_GRID: SellGridSettings = { order: null, hidden: [], lastUsed: {}, lastAmount: {} }

/** Merges a change into the shop's Sell grid settings. Not queued: it isn't a sale. */
export const updateSellGrid = (s: AppState, patch: Partial<SellGridSettings>): AppState => ({
  ...s,
  sellGrid: { ...DEFAULT_SELL_GRID, ...s.sellGrid, ...patch },
})

/** One planned purchase per supplier; nothing is sent to suppliers. */
export function planOrders(s: AppState, lines: OrderInput, now = Date.now()): Purchase[] {
  const bySupplier = new Map<string, PurchaseLine[]>()
  for (const { supplierId, ...l } of lines) bySupplier.set(supplierId, [...(bySupplier.get(supplierId) ?? []), l])
  let n = Math.max(1000, ...s.purchases.map((p) => Number(p.id.replace('PO-', '')) || 0))
  return [...bySupplier].map(([supplierId, ls]) => ({ id: `PO-${++n}`, at: now, supplierId, payment: 'Cash', status: 'planned', lines: ls }))
}

export function addOrders(s: AppState, created: Purchase[]): AppState {
  return queued({ ...s, purchases: [...created, ...s.purchases] }, 'purchase')
}

/**
 * What one unit costs after buying `qty` more at `unitPrice`: the average of
 * what is on the shelf at its old cost and what just arrived. Stock at or below
 * zero (or a cost the shop never knew) carries no weight, so the new price
 * simply becomes the cost.
 */
export function averageCost(onHand: number, cost: number, qty: number, unitPrice: number) {
  if (!(qty > 0) || !(unitPrice > 0)) return cost
  const have = Math.max(0, onHand)
  if (!(cost > 0) || have === 0) return Math.round(unitPrice * 1000) / 1000
  return Math.round(((have * cost + qty * unitPrice) / (have + qty)) * 1000) / 1000
}

/**
 * Made-to-order items cost what their ingredients cost, so when an ingredient's
 * price moves every item that uses it moves too. Unknown (0) while any
 * ingredient's cost is unknown. Returns the same array when nothing changed.
 */
function recosted(products: Product[]): Product[] {
  const byId = new Map(products.map((p) => [p.id, p]))
  let changed = false
  const out = products.map((p) => {
    if (!p.composite || !p.recipe?.length) return p
    const cost = recipeCost(p.recipe, (id) => byId.get(id)?.cost)
    if (cost === p.cost) return p
    changed = true
    return { ...p, cost }
  })
  return changed ? out : products
}

export function receivePurchase(s: AppState, id: string, now = Date.now()): AppState {
  const po = s.purchases.find((p) => p.id === id)
  if (!po || po.status === 'delivered' || po.status === 'cancelled') return s
  // A product can appear on more than one line; each line adds its own stock
  const bought = new Map<string, { qty: number; value: number }>()
  for (const l of po.lines) {
    const b = bought.get(l.productId) ?? { qty: 0, value: 0 }
    bought.set(l.productId, { qty: b.qty + l.qty, value: b.value + l.qty * l.unitPrice })
  }
  const costBefore = new Map<string, number>()
  const products = recosted(
    s.products.map((p) => {
      const b = bought.get(p.id)
      if (!b) return p
      const cost = p.composite ? p.cost : averageCost(p.stock, p.cost, b.qty, b.value / b.qty)
      if (cost !== p.cost) costBefore.set(p.id, p.cost)
      return { ...p, cost, stock: Math.round((p.stock + b.qty) * 1000) / 1000 }
    }),
  )
  return queued(
    {
      ...s,
      products,
      purchases: s.purchases.map((p) =>
        p.id === id
          ? {
              ...p,
              status: 'delivered',
              receivedAt: now,
              lines: p.lines.map((l) => (costBefore.has(l.productId) ? { ...l, costBefore: costBefore.get(l.productId) } : l)),
            }
          : p,
      ),
    },
    'stock',
    'update',
    now,
  )
}

/**
 * "Bought it · update stock": records what was bought as delivered purchases,
 * one per supplier, and adds it to stock — in one change, so the shop is never
 * left with a purchase saved but the stock not yet added.
 *
 * Adding onto negative stock is deliberate: an item sold past zero and then
 * restocked lands on the true number.
 */
export function receiveRestock(s: AppState, lines: OrderInput, now = Date.now()): AppState {
  const clean = lines.filter((l) => l.qty > 0)
  if (!clean.length) return s
  const created = planOrders(s, clean, now)
  let next = addOrders(s, created)
  for (const po of created) next = receivePurchase(next, po.id, now)
  return next
}

/**
 * Commits purchases already planned with planOrders: records them and adds
 * the stock. Split from receiveRestock so the store can plan first (to know
 * the purchase ids, for Undo) and then commit against the latest state.
 */
export function receivePlanned(s: AppState, created: Purchase[], now = Date.now()): AppState {
  let next = addOrders(s, created)
  for (const po of created) next = receivePurchase(next, po.id, now)
  return next
}

/**
 * Undo for "Bought it": takes those purchases back out and subtracts what they
 * added. Subtracting rather than restoring a snapshot keeps any sale made in
 * between — the stock ends up exactly as if the trip hadn't been recorded.
 */
export function undoRestock(s: AppState, purchaseIds: string[]): AppState {
  const undo = s.purchases.filter((p) => purchaseIds.includes(p.id) && p.status === 'delivered')
  if (!undo.length) return s
  const take = new Map<string, number>()
  // The first line seen for a product carries the cost from before the trip
  const costBack = new Map<string, number>()
  for (const po of undo) {
    for (const l of po.lines) {
      take.set(l.productId, (take.get(l.productId) ?? 0) + l.qty)
      if (l.costBefore !== undefined && !costBack.has(l.productId)) costBack.set(l.productId, l.costBefore)
    }
  }
  // A later delivery has moved the cost on since; leave that one alone
  const received = Math.max(...undo.map((p) => p.receivedAt ?? 0))
  const movedOn = (productId: string) =>
    s.purchases.some(
      (p) => !purchaseIds.includes(p.id) && p.status === 'delivered' && (p.receivedAt ?? 0) > received && p.lines.some((l) => l.productId === productId),
    )
  return queued(
    {
      ...s,
      products: recosted(
        s.products.map((p) => {
          if (!take.has(p.id)) return p
          const cost = costBack.has(p.id) && !movedOn(p.id) ? costBack.get(p.id)! : p.cost
          return { ...p, cost, stock: Math.round((p.stock - take.get(p.id)!) * 1000) / 1000 }
        }),
      ),
      purchases: s.purchases.filter((p) => !purchaseIds.includes(p.id)),
    },
    'stock',
    'update',
  )
}

/**
 * Void: takes a recorded sale back — a wrong item, a double charge. Puts back
 * the stock it took (using today's recipes) and the "sold without a recipe"
 * count it added, and moves the sale to `voidedSales`.
 */
export function voidSale(s: AppState, saleId: string, now = Date.now()): AppState {
  const sale = s.sales.find((x) => x.id === saleId)
  if (!sale) return s
  const giveBack = deductionsFor(s, sale.lines)
  const unrecipied = new Map<string, number>()
  for (const l of sale.lines) {
    const p = productById(s, l.productId)
    if (p?.composite && !p.recipe?.length) unrecipied.set(p.id, (unrecipied.get(p.id) ?? 0) + l.qty)
  }
  return queued(
    {
      ...s,
      products: s.products.map((p) => {
        let out = p
        if (giveBack.has(p.id)) out = { ...out, stock: Math.round((p.stock + giveBack.get(p.id)!) * 1000) / 1000 }
        if (unrecipied.has(p.id)) out = { ...out, soldWithoutRecipe: Math.max(0, (p.soldWithoutRecipe ?? 0) - unrecipied.get(p.id)!) }
        return out
      }),
      sales: s.sales.filter((x) => x.id !== saleId),
      voidedSales: [...(s.voidedSales ?? []), { ...sale, voidedAt: now }],
    },
    'sale',
    'update',
    now,
  )
}

export const setRestockDay = (s: AppState, day: number): AppState =>
  day >= 0 && day <= 6 ? { ...s, restockDay: Math.floor(day) } : s

export function cancelPurchase(s: AppState, id: string): AppState {
  return queued(
    { ...s, purchases: s.purchases.map((p) => (p.id === id && p.status !== 'delivered' ? { ...p, status: 'cancelled' } : p)) },
    'purchase',
    'update',
  )
}

const iconByCategory: Record<CategoryKey, string> = {
  bakery: 'bakery_dining',
  dairy: 'egg',
  pantry: 'grain',
  hot: 'lunch_dining',
  beverages: 'local_bar',
  ingredients: 'kitchen',
  other: 'sell',
}

const packLabelFor = (packSize: number, unit: string, packName?: string) =>
  packSize === 1 ? `single ${unit}` : `${packName?.trim().toLowerCase() || 'pack'} of ${packSize}`

export function createProduct(s: AppState, input: ProductInput): Product {
  const base = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || `product-${uid()}`
  let id = base
  let suffix = 2
  while (s.products.some((product) => product.id === id)) id = `${base}-${suffix++}`
  const unit = input.unit.trim().toLowerCase()
  const packSize = Math.max(1, input.packSize)
  return {
    id,
    name: input.name.trim(),
    detail: input.detail?.trim() || 'Added by you',
    category: input.category,
    icon: iconByCategory[input.category],
    sellable: true,
    price: Math.max(0, input.price),
    cost: Math.max(0, input.cost ?? 0),
    unit,
    unitPlural: input.unitPlural.trim().toLowerCase(),
    stock: Math.max(0, input.stock),
    packSize,
    packLabel: packLabelFor(packSize, unit, input.packName),
    ...groupFields(input),
  }
}

export const addProduct = (s: AppState, product: Product): AppState =>
  queued({ ...s, products: [...s.products, product] }, 'product')

/** Puts an edited product in the group the form chose; a form that didn't say leaves it where it was. */
function regrouped(p: Product, input: ProductInput): Product {
  if (input.family === undefined) return p
  const { family: _f, variant: _v, size: _s, ...rest } = p
  return { ...rest, ...groupFields(input) }
}

/** Edits an existing product, recomputing the fields derived from category and pack size. */
export function updateProduct(s: AppState, id: string, input: ProductInput): AppState {
  const unit = input.unit.trim().toLowerCase()
  const packSize = Math.max(1, input.packSize)
  return queued(
    {
      ...s,
      products: recosted(s.products.map((p) =>
        p.id === id
          ? regrouped({
              ...p,
              name: input.name.trim(),
              detail: input.detail?.trim() || p.detail,
              category: input.category,
              icon: iconByCategory[input.category],
              price: Math.max(0, input.price),
              cost: input.cost === undefined ? p.cost : Math.max(0, input.cost),
              // Editing a product never touches its stock: that changes through
              // counts, sales and restocks. Clamping here used to zero an
              // oversold item and wipe its "check this" flag.
              stock: p.stock,
              unit,
              unitPlural: input.unitPlural.trim().toLowerCase(),
              packSize,
              // Keep "crate of 10" when nothing about the pack changed, instead
              // of renaming it to the generic "pack of 10"
              packLabel:
                input.packName || packSize !== p.packSize ? packLabelFor(packSize, unit, input.packName) : p.packLabel,
            }, input)
          : p,
      )),
    },
    'product',
    'update',
  )
}

export function upsertSupplierPrice(s: AppState, input: SupplierPriceInput, now = Date.now()): AppState {
  const { productId, unitPrice, minOrder, location } = input
  const name = input.supplierName.trim()
  let supplier = s.suppliers.find((x) => x.name.toLowerCase() === name.toLowerCase())
  const suppliers = supplier ? s.suppliers : [...s.suppliers, (supplier = { id: `sup-${uid()}`, name, location: location?.trim() || undefined })]
  const supplierId = supplier.id
  const existing = s.prices.find((x) => x.productId === productId && x.supplierId === supplierId)
  const prices = existing
    ? s.prices.map((x) =>
        x === existing ? { ...x, unitPrice, minOrder, updatedAt: now, history: [...x.history, { at: now, price: unitPrice }].slice(-12) } : x,
      )
    : [...s.prices, { id: `price-${uid()}`, supplierId, productId, unitPrice, minOrder, updatedAt: now, history: [{ at: now, price: unitPrice }] }]
  return queued({ ...s, suppliers, prices }, 'supplier_price', 'update', now)
}

export const setPreferredSupplier = (s: AppState, productId: string, supplierId: string): AppState => ({
  ...s,
  preferred: { ...s.preferred, [productId]: supplierId },
})

export const setBudget = (s: AppState, n: number): AppState => ({ ...s, budget: Math.max(0, n) })

export const updateProfile = (s: AppState, p: Partial<Profile>): AppState => queued({ ...s, profile: { ...s.profile, ...p } }, 'profile', 'update')

/**
 * Turns the onboarding answers into the shop's opening catalogue.
 *
 * The demo sales, purchases and supplier prices go with it. A real shop must
 * not open the Dashboard to twelve weeks of invented takings — every number on
 * that screen would be a lie, and nobody can tell which ones. Suppliers and
 * prices are cleared for the same reason: they belong to the demo shop, not
 * this one. Someone who would rather look around the demo skips this step.
 */
export function applyStarterPacks(
  s: AppState,
  sel: StarterSelection,
  profile?: Partial<Profile>,
  counts: StockCounts = {},
  now = Date.now(),
): AppState {
  return queued(
    {
      ...s,
      products: withCounts(buildStarterCatalogue(sel), counts),
      suppliers: [],
      prices: [],
      sales: [],
      purchases: [],
      preferred: {},
      profile: { ...s.profile, ...profile },
      onboardedAt: now,
    },
    'product',
    'create',
    now,
  )
}

/**
 * "Explore with sample data": keeps the sample catalogue, its suppliers and
 * prices to look around and sell from, and stops asking. The sample sales,
 * voids and orders go: they are invented takings, and Home, Profit and Restock
 * would show them as this shop's. The SQLite store's demoShop() does the same.
 */
export function skipOnboarding(s: AppState, profile?: Partial<Profile>, now = Date.now()): AppState {
  return { ...s, sales: [], voidedSales: [], purchases: [], profile: { ...s.profile, ...profile }, onboardedAt: now }
}

/** Counted quantities by product id. Anything absent is left as it was. */
export type StockCounts = Record<string, number>

/**
 * Composite products are skipped: their stock is worked out from their
 * ingredients, so writing a number onto a kota would be a number nothing reads.
 */
function withCounts(products: Product[], counts: StockCounts): Product[] {
  return products.map((p) => {
    const counted = counts[p.id]
    if (p.composite || counted === undefined || !Number.isFinite(counted)) return p
    return { ...p, stock: Math.max(0, counted) }
  })
}

/** Every item with a shelf count was counted (kotas and airtime have none). */
export const isFullCount = (s: AppState, counts: StockCounts) =>
  stockItems(s).every((p) => counts[p.id] !== undefined && Number.isFinite(counts[p.id]))

/**
 * A stock count done outside onboarding, from the count screen. It sets the
 * counted items and nothing else: an item the owner didn't count keeps the
 * app's number, a negative one included.
 *
 * "Sold without a recipe" flags are left alone: they clear when that item gets
 * a recipe (buildMenuItem). The count date moves only on a full count, because
 * recipe suggestions compare every ingredient against what was sold since then.
 */
export function setStockCounts(s: AppState, counts: StockCounts, now = Date.now()): AppState {
  return queued(
    {
      ...s,
      products: withCounts(s.products, counts),
      ...(isFullCount(s, counts) ? { lastCountAt: now } : {}),
    },
    'stock',
    'update',
    now,
  )
}

/**
 * Decides what to do with a state saved before onboarding existed.
 *
 * The field being absent is the only reliable sign of such a state: a shop with
 * sales in it was set up by hand and must not be asked to do it again, while a
 * state that already carries the field (`null` included) has been through this
 * code and keeps whatever it says. A new account cannot be judged on its sales
 * because it is seeded with demo ones.
 */
export function adoptOnboardingFlag(s: AppState, now = Date.now()): AppState {
  if ('onboardedAt' in s) return s
  return { ...s, onboardedAt: s.sales.length > 0 ? now : null }
}

/**
 * Everything a saved shop needs on the way in, from the phone or from a
 * backup. Each step is a no-op on a state that's already current, so it's safe
 * to run on every load.
 */
export function migrateState(s: AppState, now = Date.now()): AppState {
  let out = adoptOnboardingFlag(s, now)

  // "kota" used to be a built-in family. It's an owner-named menu group now,
  // so a shop that also makes burgers isn't stuck with the app's word for food.
  // Read as raw saved data: the type no longer allows "kota", but old saves have it
  const legacyKota = (p: Product) => (p as unknown as { family?: string }).family === 'kota'
  if (out.products.some(legacyKota)) {
    out = {
      ...out,
      products: out.products.map((p) => {
        if (!legacyKota(p)) return p
        const { family: _family, ...rest } = p
        return { ...rest, menu: p.menu ?? 'Kota' }
      }),
    }
  }

  // lastUsed used to be keyed by family ("bread"); it's keyed by tile id now
  const lastUsed = out.sellGrid?.lastUsed
  if (lastUsed && Object.keys(lastUsed).some((k) => !k.includes(':'))) {
    const rekeyed: Record<string, string> = {}
    for (const [k, v] of Object.entries(lastUsed)) {
      rekeyed[k.includes(':') ? k : k === 'kota' ? 'menu:Kota' : `family:${k}`] = v
    }
    out = { ...out, sellGrid: { ...out.sellGrid!, lastUsed: rekeyed } }
  }
  return out
}

/**
 * Builds a made-to-order item, new or edited, without committing it — the
 * store commits it with a functional update so nothing in between is lost.
 * The recipe is what makes a sale take the ingredients off stock; with an
 * empty one the item still sells, and is flagged for the owner.
 */
export function buildMenuItem(s: AppState, input: MenuItemInput, id?: string): Product {
  const recipe = input.recipe.filter((l) => l.qty > 0 && productById(s, l.productId))
  const fields = {
    name: input.name.trim(),
    price: Math.max(0, input.price),
    menu: input.menu.trim() || 'Menu',
    recipe,
    cost: recipeCost(recipe, (id) => productById(s, id)?.cost),
    // Having a recipe is what the "sold without a recipe" flag was asking for
    ...(recipe.length ? { soldWithoutRecipe: 0 } : {}),
  }
  const existing = id ? productById(s, id) : undefined
  if (existing) return { ...existing, ...fields }
  return {
    id: `menu-${uid()}`,
    detail: 'Made to order',
    category: 'hot',
    icon: 'lunch_dining',
    sellable: true,
    unit: 'item',
    unitPlural: 'items',
    // Never counted: what's left of the ingredients is what limits it
    stock: 0,
    packSize: 1,
    packLabel: 'made to order',
    composite: true,
    ...fields,
  }
}

/** Puts a built product into the catalogue, replacing it if it's already there. */
export const upsertProduct = (s: AppState, product: Product): AppState => {
  const exists = s.products.some((p) => p.id === product.id)
  return queued(
    { ...s, products: exists ? s.products.map((p) => (p.id === product.id ? product : p)) : [...s.products, product] },
    'product',
    exists ? 'update' : 'create',
  )
}

/** Off the menu, but still in the catalogue so past sales keep their names. */
export const removeMenuItem = (s: AppState, id: string): AppState =>
  queued(
    { ...s, products: s.products.map((p) => (p.id === id ? { ...p, sellable: false, menu: undefined } : p)) },
    'product',
    'update',
  )

/** A stock item to cook with. Starts at 0 — it's counted, never guessed. */
export function buildIngredient(input: IngredientInput): Product {
  const unit = input.unit.trim() || 'unit'
  const packSize = Math.max(1, input.packSize || 1)
  return {
    id: `ing-${uid()}`,
    name: input.name.trim(),
    detail: 'Ingredient',
    category: 'ingredients',
    icon: 'kitchen',
    sellable: false,
    price: 0,
    cost: Math.max(0, input.cost ?? 0),
    unit,
    // Measures don't take an "s": 2 kg, not 2 kgs
    unitPlural: input.unitPlural?.trim() || (['kg', 'g', 'L', 'ml'].includes(unit) ? unit : `${unit}s`),
    stock: 0,
    packSize,
    packLabel: input.packLabel?.trim() || `pack of ${packSize}`,
    ...(input.portion && input.portion.perUnit > 0 && input.portion.name.trim() ? { portion: input.portion } : {}),
  }
}

export const PHOTO_FULL_MESSAGE = 'There is no space left on this device for more photos. Remove one and try again.'
export const PHOTO_SAVED_MESSAGE = 'Photo saved on this device.'
