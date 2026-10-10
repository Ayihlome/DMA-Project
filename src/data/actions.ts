/**
 * Pure state transitions shared by the web and mobile stores. Each function takes the
 * current state and returns the next one (including its sync-queue entry), so both apps
 * apply exactly the same business rules; only persistence differs per platform.
 */
import type { AppState, CategoryKey, Product, Profile, Purchase, PurchaseLine, SaleLine, SyncOp } from './types'
import { deductionsFor, productById, unitQty } from './inventory'

export type Result = { ok: true; message: string } | { ok: false; message: string }

export type SaleInput = { productId: string; qty: number }[]
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
}

/** The API both store providers expose through `useStore()`. */
export type StoreApi = {
  state: AppState
  photos: Record<string, string>
  online: boolean
  pending: number
  recordSale: (lines: SaleInput) => Result
  createOrderList: (lines: OrderInput) => Purchase[]
  receivePurchase: (id: string) => void
  cancelPurchase: (id: string) => void
  addProduct: (input: ProductInput) => Product
  upsertSupplierPrice: (input: SupplierPriceInput) => void
  setPreferredSupplier: (productId: string, supplierId: string) => void
  setBudget: (n: number) => void
  updateProfile: (p: Partial<Profile>) => void
  /** Async so the mobile store can await device storage; the web store resolves immediately. */
  setPhoto: (productId: string, dataUrl: string) => Promise<Result>
  removePhoto: (productId: string) => void
  resetDemoData: () => void
}

export const STATE_KEY = 'stockevo-state-v1'
export const PHOTO_KEY = 'stockevo-photos'
export const SYNC_DELAY_MS = 1500

export const uid = () => Math.random().toString(36).slice(2, 10)

function queued(s: AppState, entity: SyncOp['entity'], kind: SyncOp['op'] = 'create', now = Date.now()): AppState {
  return { ...s, queue: [...s.queue, { id: uid(), entity, op: kind, at: now, status: 'pending', retries: 0 }] }
}

export const pendingCount = (s: AppState) => s.queue.filter((q) => q.status === 'pending').length

export function isValidState(x: unknown): x is AppState {
  return !!x && typeof x === 'object' && (x as AppState).version === 1
}

/** There is no backend yet, so acknowledging queued operations is simulated. */
export function markSynced(s: AppState, now = Date.now()): AppState {
  return {
    ...s,
    queue: s.queue.map((q) => (q.status === 'pending' ? { ...q, status: 'synced' as const } : q)).slice(-50),
    lastSyncedAt: now,
  }
}

/** FR3 + BR1 + BR2: validates the sale, then applies it and every stock deduction in one step. */
export function recordSale(s: AppState, lines: SaleInput, now = Date.now()): Result & { state?: AppState } {
  const clean = lines.filter((l) => l.qty > 0)
  if (!clean.length) return { ok: false, message: 'Add at least one item to the sale.' }
  for (const l of clean) {
    const p = productById(s, l.productId)
    if (!p) return { ok: false, message: 'One of the items is no longer in the catalogue.' }
    if (p.composite && !p.recipe?.length) return { ok: false, message: `${p.name} has no recipe yet. Set up its ingredients before selling it.` }
  }
  const deductions = deductionsFor(s, clean)
  for (const [id, n] of deductions) {
    const p = productById(s, id)!
    if (p.stock + 1e-9 < n) return { ok: false, message: `Not enough ${p.name}: ${unitQty(p, p.stock)} left, this sale needs ${unitQty(p, n)}.` }
  }
  const saleLines: SaleLine[] = clean.map((l) => ({ ...l, price: productById(s, l.productId)!.price }))
  const total = Math.round(saleLines.reduce((t, l) => t + l.qty * l.price, 0) * 100) / 100
  const next: AppState = {
    ...s,
    products: s.products.map((p) => (deductions.has(p.id) ? { ...p, stock: Math.round((p.stock - deductions.get(p.id)!) * 1000) / 1000 } : p)),
    sales: [...s.sales, { id: `sale-${uid()}`, at: now, lines: saleLines, total }],
  }
  return { ok: true, message: `Sale of R${total.toFixed(2)} recorded. Stock updated.`, state: queued(next, 'sale', 'create', now) }
}

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

export function receivePurchase(s: AppState, id: string, now = Date.now()): AppState {
  const po = s.purchases.find((p) => p.id === id)
  if (!po || po.status === 'delivered' || po.status === 'cancelled') return s
  const add = new Map(po.lines.map((l) => [l.productId, l.qty]))
  return queued(
    {
      ...s,
      products: s.products.map((p) => (add.has(p.id) ? { ...p, stock: Math.round((p.stock + add.get(p.id)!) * 1000) / 1000 } : p)),
      purchases: s.purchases.map((p) => (p.id === id ? { ...p, status: 'delivered', receivedAt: now } : p)),
    },
    'stock',
    'update',
    now,
  )
}

export function cancelPurchase(s: AppState, id: string): AppState {
  return queued(
    { ...s, purchases: s.purchases.map((p) => (p.id === id && p.status !== 'delivered' ? { ...p, status: 'cancelled' } : p)) },
    'purchase',
    'update',
  )
}

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
  const iconByCategory: Record<CategoryKey, string> = {
    bakery: 'bakery_dining',
    dairy: 'egg',
    pantry: 'grain',
    hot: 'lunch_dining',
    beverages: 'local_bar',
    ingredients: 'kitchen',
  }
  return {
    id,
    name: input.name.trim(),
    detail: input.detail?.trim() || 'Added by you',
    category: input.category,
    icon: iconByCategory[input.category],
    sellable: true,
    price: Math.max(0, input.price),
    cost: 0,
    unit,
    unitPlural: input.unitPlural.trim().toLowerCase(),
    stock: Math.max(0, input.stock),
    packSize,
    packLabel: packSize === 1 ? `single ${unit}` : `pack of ${packSize}`,
  }
}

export const addProduct = (s: AppState, product: Product): AppState =>
  queued({ ...s, products: [...s.products, product] }, 'product')

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

export const PHOTO_FULL_MESSAGE = 'There is no space left on this device for more photos. Remove one and try again.'
export const PHOTO_SAVED_MESSAGE = 'Photo saved on this device.'
