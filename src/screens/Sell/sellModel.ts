/**
 * Quick sell's logic, with no React in it: which tiles exist, what order they
 * go in, and how a sale in progress changes as items are added and undone.
 * Kept pure so it can be checked without rendering anything.
 */
import {
  FAMILIES,
  QUICK_AMOUNT_ID,
  type Family,
  type Product,
  type Sale,
  type SellGridSettings,
} from '../../data/types'
import { money } from '../../theme/tokens'

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

/**
 * A grid tile. `group` covers both kinds of picker tile: the built-in families
 * (bread, airtime, cold drink — `family` set) and the groups the owner names
 * for made-to-order food ("Kota", "Burgers", "Menu" — `menu` set).
 */
export type GroupTile = {
  kind: 'group'
  id: string
  label: string
  icon: string
  members: Product[]
  family?: Family
  menu?: string
}

export type Tile = { kind: 'single'; id: string; product: Product } | GroupTile | { kind: 'quick'; id: typeof QUICK_AMOUNT_ID }

export const familyTileId = (f: Family) => `family:${f}`
export const menuTileId = (name: string) => `menu:${name}`

/** The tile a product is rung up from. */
export const tileIdFor = (p: Product) => (p.family ? familyTileId(p.family) : p.menu ? menuTileId(p.menu) : p.id)

/**
 * Every tile the shop could show: one per sellable product that isn't grouped,
 * one per built-in family and per owner-named menu group that has anything in
 * it, and the quick-amount tile. Ingredients (not sellable) never get a tile.
 */
export function buildTiles(products: Product[]): Tile[] {
  const sellable = products.filter((p) => p.sellable)
  const tiles: Tile[] = sellable
    .filter((p) => !p.family && !p.menu)
    .map((p) => ({ kind: 'single', id: p.id, product: p }))
  for (const f of FAMILIES) {
    const members = sellable.filter((p) => p.family === f.key)
    if (members.length) tiles.push({ kind: 'group', id: familyTileId(f.key), label: f.label, icon: f.icon, members, family: f.key })
  }
  // Menu groups are whatever names the owner has typed, in the order first seen
  const names = [...new Set(sellable.filter((p) => !p.family && p.menu).map((p) => p.menu!))]
  for (const name of names) {
    const members = sellable.filter((p) => !p.family && p.menu === name)
    tiles.push({ kind: 'group', id: menuTileId(name), label: name, icon: 'lunch_dining', members, menu: name })
  }
  tiles.push({ kind: 'quick', id: QUICK_AMOUNT_ID })
  return tiles
}

/** Every menu group name in use, for the editor's suggestions. */
export const menuNames = (products: Product[]) =>
  [...new Set(products.filter((p) => p.sellable && p.menu).map((p) => p.menu!))].sort((a, b) => a.localeCompare(b))

const BEST_SELLER_WINDOW = 30 * 86_400_000

/** Units sold per tile over the last 30 days. A family tile counts all its members. */
export function tileSales(sales: Sale[], products: Product[], now = Date.now()) {
  const byId = new Map(products.map((p) => [p.id, p]))
  const out = new Map<string, number>()
  for (const s of sales) {
    if (now - s.at > BEST_SELLER_WINDOW) continue
    for (const l of s.lines) {
      const p = byId.get(l.productId)
      const id = p ? tileIdFor(p) : l.productId
      out.set(id, (out.get(id) ?? 0) + l.qty)
    }
  }
  return out
}

export const tileName = (t: Tile) => (t.kind === 'single' ? t.product.name : t.kind === 'group' ? t.label : 'Quick amount')

/**
 * Best sellers first until the owner arranges the grid themselves. Once they
 * have, their order wins, and anything new (a product added since) goes at the
 * end in best-seller order rather than jumping into the middle.
 */
export function orderTiles(tiles: Tile[], grid: SellGridSettings, sold: Map<string, number>): Tile[] {
  const byScore = (a: Tile, b: Tile) =>
    // Quick amount sits last in the default order: it's the fallback, not a product
    Number(a.kind === 'quick') - Number(b.kind === 'quick') ||
    (sold.get(b.id) ?? 0) - (sold.get(a.id) ?? 0) ||
    tileName(a).localeCompare(tileName(b))

  const visible = tiles.filter((t) => !grid.hidden.includes(t.id))
  if (!grid.order) return visible.sort(byScore)

  const pos = new Map(grid.order.map((id, i) => [id, i]))
  const placed = visible.filter((t) => pos.has(t.id)).sort((a, b) => pos.get(a.id)! - pos.get(b.id)!)
  const fresh = visible.filter((t) => !pos.has(t.id)).sort(byScore)
  return [...placed, ...fresh]
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * What a line is called at the counter: "Albany bread", "Coke 2L",
 * "MTN R29". Shorter than the catalogue name, and it says which variant.
 */
export function shortName(p: Product | undefined, price?: number, label?: string): string {
  if (!p) return label && price != null ? `${label} ${money(price, { whole: Number.isInteger(price) })}` : label ?? 'Item'
  switch (p.family) {
    case 'bread':
      return `${p.variant} bread`
    case 'colddrink':
      return `${p.variant} ${p.size === 'can' ? 'can' : p.size}`
    case 'airtime':
      return `${p.variant} ${money(price ?? p.price, { whole: true })}`
    default:
      return p.name
  }
}

// ---------------------------------------------------------------------------
// Sales in progress
// ---------------------------------------------------------------------------

/**
 * One line in a sale being built. Counter-priced items at different prices
 * (airtime R5 vs R29) are separate lines; a fixed-price item is always one line.
 */
export type DraftLine = { key: string; productId: string; qty: number; price: number; label?: string; counterPriced?: boolean }

/** One add, remembered so Undo can take back exactly that. */
export type AddEvent = { key: string; qty: number }

export type Draft = {
  id: string
  /** Display number for parked tabs: "Sale 2". */
  n: number
  lines: DraftLine[]
  history: AddEvent[]
}

export type AddItem = {
  productId: string
  price: number
  label?: string
  /** The price was chosen at the counter (airtime amount, quick amount), so it's part of what the line is. */
  counterPriced?: boolean
}

/**
 * Only counter-priced items carry their price in the key. A fixed-price item
 * keyed by price would split into two lines the moment its price was edited
 * mid-sale — the old-price line and the new one.
 */
export const lineKey = (i: AddItem) => (i.counterPriced ? `${i.productId}@${i.price}` : i.productId)

export function emptyDraft(n: number): Draft {
  return { id: `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, n, lines: [], history: [] }
}

/** Adds `qty` of an item, merging into its line if it's already there. */
export function addToDraft(d: Draft, item: AddItem, qty: number): Draft {
  if (qty <= 0) return d
  const key = lineKey(item)
  const exists = d.lines.some((l) => l.key === key)
  const lines = exists
    ? d.lines.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l))
    : [...d.lines, { key, ...item, qty }]
  return { ...d, lines, history: [...d.history, { key, qty }] }
}

/**
 * Takes back the most recent add, whole. A line that drops to zero goes, and
 * no confirmation is asked — Undo is itself the safety net.
 */
export function undoLast(d: Draft): Draft {
  const last = d.history.at(-1)
  if (!last) return d
  const lines = d.lines
    .map((l) => (l.key === last.key ? { ...l, qty: l.qty - last.qty } : l))
    .filter((l) => l.qty > 0)
  return { ...d, lines, history: d.history.slice(0, -1) }
}

export const draftTotal = (d: Draft) => Math.round(d.lines.reduce((t, l) => t + l.qty * l.price, 0) * 100) / 100
export const draftCount = (d: Draft) => d.lines.reduce((t, l) => t + l.qty, 0)

/**
 * Lines most-recent-first, for the panel's "last 3 lines". Order follows the
 * history, so a line you just added to again moves back to the top.
 */
export function recentLines(d: Draft): DraftLine[] {
  const seen = new Set<string>()
  const out: DraftLine[] = []
  for (let i = d.history.length - 1; i >= 0; i--) {
    const key = d.history[i].key
    if (seen.has(key)) continue
    seen.add(key)
    const line = d.lines.find((l) => l.key === key)
    if (line) out.push(line)
  }
  return out
}

/** The black badge on a tile: how many of it (or its group) are in the sale. */
export function tileQty(t: Tile, d: Draft, products: Product[]): number {
  if (t.kind === 'quick') return d.lines.filter((l) => l.productId === QUICK_AMOUNT_ID).reduce((n, l) => n + l.qty, 0)
  if (t.kind === 'single') return d.lines.filter((l) => l.productId === t.product.id).reduce((n, l) => n + l.qty, 0)
  const members = new Set(t.members.map((p) => p.id))
  return d.lines.filter((l) => members.has(l.productId)).reduce((n, l) => n + l.qty, 0)
}

/** Qty of one exact item (product at a price) in the sale — for the hold toast. */
export const itemQty = (d: Draft, item: AddItem) => d.lines.find((l) => l.key === lineKey(item))?.qty ?? 0

/**
 * The draft with every fixed-price line at today's catalogue price.
 *
 * A line remembers the price it was added at, but Charge records the
 * catalogue price for anything that isn't priced at the counter (airtime, quick
 * amount). If the owner edits a price mid-sale, showing the old one would put a
 * different total on screen from the one that gets saved. Everything on screen
 * reads from this, so what's shown is what's charged.
 */
export function repriceDraft(d: Draft, products: Map<string, Product>): Draft {
  let changed = false
  const lines = d.lines.map((l) => {
    const p = products.get(l.productId)
    if (!p || p.priceOptions?.length || p.price === l.price) return l
    changed = true
    return { ...l, price: p.price }
  })
  return changed ? { ...d, lines } : d
}

/** Turns a draft into what the store records. */
export const draftToSale = (d: Draft) =>
  d.lines.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price, ...(l.label ? { label: l.label } : {}) }))

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

/**
 * What a group tile's last-used choice resolves to, ready to add — used by
 * the hold gesture. `null` when nothing has been sold from it yet, in which
 * case the picker opens instead of guessing.
 */
export function lastUsedItem(t: GroupTile, grid: SellGridSettings): AddItem | null {
  const id = grid.lastUsed[t.id]
  const p = id ? t.members.find((m) => m.id === id) : undefined
  if (!p) return null
  if (p.priceOptions?.length) {
    const amount = grid.lastAmount?.[p.id]
    return { productId: p.id, price: amount && p.priceOptions.includes(amount) ? amount : p.priceOptions[0], counterPriced: true }
  }
  return { productId: p.id, price: p.price }
}

/** Puts the last-used value first, keeping the rest in their natural order. */
export function lastFirst<T>(items: T[], isLast: (t: T) => boolean): T[] {
  const i = items.findIndex(isLast)
  return i <= 0 ? items : [items[i], ...items.slice(0, i), ...items.slice(i + 1)]
}

// ---------------------------------------------------------------------------
// Paying
// ---------------------------------------------------------------------------

const NOTES = [50, 100, 200]

/**
 * The cash a customer might hand over: Exact, then the notes from the spec
 * (R50, R100, R200). One addition: on a total above R200 none of those cover
 * it, so the total rounded up to the next R50 is offered too — a R230 sale
 * paid with R250 is common, and "Still owes" would be wrong for it.
 */
export function cashOptions(total: number): { key: string; label: string; amount: number }[] {
  const out = [{ key: 'exact', label: 'Exact', amount: total }]
  for (const n of NOTES) out.push({ key: String(n), label: money(n, { whole: true }), amount: n })
  if (total > NOTES[NOTES.length - 1]) {
    const up = Math.ceil(total / 50) * 50
    if (up > total) out.push({ key: `up-${up}`, label: money(up, { whole: true }), amount: up })
  }
  return out
}
