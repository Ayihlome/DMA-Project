/**
 * Turns a change in the screens' AppState into use-case calls.
 *
 * The screens work on an in-memory AppState and the pure functions in actions.ts. This file takes
 * the state before and after an action and calls the use cases that make SQLite (and, through the
 * sync queue, Supabase) say the same thing. It knows nothing about React, so it can be tested on
 * its own.
 *
 * Not covered here (no use case yet, kept in the phone's overlay by sqliteStore.tsx): budget,
 * profile, preferred supplier, onboarding flag, sell grid, purchase orders.
 */
import type { AppState, Product } from './types'
import type { SaleInput, SaleMeta } from './actions'

// Same shape as `useCases` in src/backend/useCases/container.js
export type UseCases = Record<string, (input?: any) => Promise<any>>

declare const crypto: { randomUUID(): string }
export const newId = () => crypto.randomUUID()

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The v2-only fields of a product. They live in products.meta, so the table needs no new column per field. */
export function productMeta(p: Product) {
  const meta: Record<string, unknown> = {
    detail: p.detail,
    icon: p.icon,
    sellable: p.sellable,
    cost: p.cost,
    unitPlural: p.unitPlural,
    packLabel: p.packLabel,
  }
  if (p.image) meta.image = p.image
  if (p.family) meta.family = p.family
  if (p.menu) meta.menu = p.menu
  if (p.variant) meta.variant = p.variant
  if (p.size) meta.size = p.size
  if (p.priceOptions) meta.priceOptions = p.priceOptions
  if (p.untracked) meta.untracked = true
  return meta
}

/**
 * Supabase ids are uuids, the screens' own ids are not ("white-bread", "menu-x7k2").
 * Gives every product a uuid and rewrites everything that points at it.
 */
export function uuidify(state: Pick<AppState, 'products' | 'prices' | 'preferred'>) {
  const ids = new Map(state.products.map((p) => [p.id, newId()]))
  const swap = (id: string) => ids.get(id) ?? id
  return {
    ids,
    products: state.products.map((p) => ({
      ...p,
      id: swap(p.id),
      ...(p.recipe ? { recipe: p.recipe.map((l) => ({ ...l, productId: swap(l.productId) })) } : {}),
    })),
    prices: state.prices.map((x) => ({ ...x, productId: swap(x.productId) })),
    preferred: Object.fromEntries(Object.entries(state.preferred).map(([productId, supplierId]) => [swap(productId), supplierId])),
  }
}

const failed = (r: { success?: boolean; errors?: string[] } | undefined, what: string) =>
  r?.success ? [] : [`${what}: ${(r?.errors ?? ['no answer']).join(', ')}`]

/** A sale. Lenient: the counter never refuses one over stock, a negative count is how an item gets flagged. */
export async function persistSale(
  uc: UseCases,
  ownerID: string,
  lines: SaleInput,
  meta: SaleMeta = {},
  // told the real sale id, because the screen's own copy of the sale has a placeholder id until the next refresh
  onSaleId?: (saleID: string) => void,
) {
  const r = await uc.recordSale({
    ownerID,
    allowNegativeStock: true,
    payment: meta.payment,
    cashGiven: meta.cashGiven,
    items: lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        productID: l.productId,
        quantitySold: l.qty,
        ...(l.price != null ? { price: l.price } : {}),
        ...(l.label ? { label: l.label } : {}),
      })),
  })
  if (r?.success && onSaleId) onSaleId(r.saleID)
  return failed(r, 'recordSale')
}
/** Takes a sale back: marked voided on file, its stock goes back. */
export async function persistVoid(uc: UseCases, saleID: string) {
  return failed(await uc.voidSale({ saleID }), 'voidSale')
}

/** Stock arriving from a delivered order. */
export async function persistReceive(uc: UseCases, lines: { productId: string; qty: number }[]) {
  const errors: string[] = []
  for (const l of lines) errors.push(...failed(await uc.receiveStock({ productID: l.productId, quantity: l.qty }), 'receiveStock'))
  return errors
}

   /** Stock taken back out (Undo on a restock). May go below zero, like a sale can. */
export async function persistUndoStock(uc: UseCases, lines: { productId: string; qty: number }[]) {
  const errors: string[] = []
  for (const l of lines) {
    errors.push(...failed(await uc.adjustStock({ productID: l.productId, delta: -l.qty, reason: 'restock_undo' }), 'adjustStock'))
  }
  return errors
}

/**
 * Everything else: whatever differs between `prev` and `next` is written through createProduct,
 * updateProduct, setRecipeComponents and saveSupplierPrice.
 *
 * Returns the errors (empty when all went in) and the real id of each supplier whose screen id
 * was only a placeholder.
 */
export async function persistChange(uc: UseCases, prev: AppState, next: AppState) {
  const errors: string[] = []
  const supplierIds = new Map<string, string>()
  const before = new Map(prev.products.map((p) => [p.id, p]))
  const after = new Set(next.products.map((p) => p.id))

  // 1. new products, then their recipes (a recipe needs every ingredient to exist)
  const created = next.products.filter((p) => !before.has(p.id))
  for (const p of created) {
    errors.push(
      ...failed(
        await uc.createProduct({
          id: p.id,
          name: p.name,
          unit: p.unit,
          isComposite: !!p.composite,
          sellingPrice: p.price,
          category: p.category,
          packSize: p.packSize,
          openingStock: p.composite ? 0 : p.stock,
          meta: productMeta(p),
        }),
        `createProduct ${p.name}`,
      ),
    )
  }
  for (const p of created) {
    if (p.composite && p.recipe?.length) errors.push(...(await writeRecipe(uc, p)))
  }

  // 2. edits to products that were already there
  for (const p of next.products) {
    const old = before.get(p.id)
    if (!old) continue
    const input: Record<string, unknown> = {}
    if (p.name !== old.name) input.name = p.name
    if (p.unit !== old.unit) input.unit = p.unit
    if (p.price !== old.price) input.sellingPrice = p.price
    if (p.category !== old.category) input.category = p.category
    if (p.packSize !== old.packSize) input.packSize = p.packSize
    if (!same(productMeta(p), productMeta(old))) input.meta = productMeta(p)
    if (!p.composite && p.stock !== old.stock) input.stockOnHand = p.stock
    if ((old.soldWithoutRecipe ?? 0) > 0 && !(p.soldWithoutRecipe ?? 0)) input.soldWithoutRecipe = 0
    if (Object.keys(input).length) {
      errors.push(...failed(await uc.updateProduct({ productID: p.id, ...input }), `updateProduct ${p.name}`))
    }
    if (p.composite && !same(p.recipe ?? [], old.recipe ?? [])) errors.push(...(await writeRecipe(uc, p)))
  }

  // 3. nothing deletes a product yet
  for (const id of before.keys()) {
    if (!after.has(id)) errors.push(`product ${id} was removed on screen; deleting products is not supported yet`)
  }

  // 4. supplier prices (the supplier is created by name when it is new)
  const oldPrices = new Map(prev.prices.map((x) => [x.id, x]))
  const supplierOf = new Map(next.suppliers.map((s) => [s.id, s]))
  for (const x of next.prices) {
    const old = oldPrices.get(x.id)
    if (old && old.unitPrice === x.unitPrice && old.minOrder === x.minOrder) continue
    const supplier = supplierOf.get(x.supplierId)
    if (!supplier) continue
    const r = await uc.saveSupplierPrice({
      productID: x.productId,
      supplierName: supplier.name,
      location: supplier.location,
      unitPrice: x.unitPrice,
      minimumOrder: x.minOrder,
    })
    errors.push(...failed(r, `saveSupplierPrice ${supplier.name}`))
    if (r?.success && r.supplier.id !== supplier.id) supplierIds.set(supplier.id, r.supplier.id)
  }

  return { errors, supplierIds }
}

async function writeRecipe(uc: UseCases, p: Product) {
  const components = (p.recipe ?? []).map((l) => ({ componentProductID: l.productId, quantityRequired: l.qty }))
  return failed(await uc.setRecipeComponents({ parentProductID: p.id, components, allowEmpty: true }), `setRecipeComponents ${p.name}`)
}

/** The demo shop offered by "Skip": its catalogue, suppliers and prices, but not twelve weeks of invented takings. */
export function demoShop(seed: AppState): AppState {
  const { products, prices, preferred } = uuidify(seed)
  return { ...seed, products, prices, preferred, sales: [], purchases: [], queue: [] }
}

/** A shop with nothing in it, not yet onboarded. What a new account starts from. */
export function emptyShop(now = Date.now()): AppState {
  return {
    version: 1,
    products: [],
    suppliers: [],
    prices: [],
    sales: [],
    purchases: [],
    preferred: {},
    budget: 0,
    profile: { ownerName: '', storeName: '', role: 'Owner', memberSince: now },
    queue: [],
    lastSyncedAt: 0,
    onboardedAt: null,
  }
}

/**
 * The fields no use case stores yet. They live on the phone (AsyncStorage) until the
 * settings and order use cases exist, and are laid over what loadShop returns.
 */

export type Overlay = Pick<AppState, 'purchases' | 'preferred' | 'budget' | 'profile' | 'onboardedAt' | 'sellGrid' | 'restockDay'>

export const overlayOf = (s: AppState): Overlay => ({
  purchases: s.purchases,
  preferred: s.preferred,
  budget: s.budget,
  profile: s.profile,
  onboardedAt: s.onboardedAt,
  ...(s.sellGrid ? { sellGrid: s.sellGrid } : {}),
  ...(s.restockDay !== undefined ? { restockDay: s.restockDay } : {}),
})

export function withOverlay(shop: AppState, overlay: Overlay | null, now = Date.now()): AppState {
  if (!overlay) {
    // A shop that already has products (set up before this store existed) must not be sent through onboarding again
    return { ...shop, onboardedAt: shop.products.length ? now : null }
  }
  return {
    ...shop,
    purchases: overlay.purchases,
    preferred: overlay.preferred,
    budget: overlay.budget,
    profile: overlay.profile,
    onboardedAt: overlay.onboardedAt ?? null,
    ...(overlay.sellGrid ? { sellGrid: overlay.sellGrid } : {}),
    ...(overlay.restockDay !== undefined ? { restockDay: overlay.restockDay } : {}),
  }
}