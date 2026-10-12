/**
 * Starter catalogues offered during onboarding.
 *
 * The setup burden is the reason stock apps get abandoned: nobody types in
 * sixty products before they can see whether the app is worth anything. So
 * onboarding asks two questions instead — what do you sell, and which kotas do
 * you make — and seeds a catalogue from the answers. The owner then adjusts
 * prices they can already see, which is a different and much smaller job from
 * creating products from nothing.
 *
 * Everything here starts at `stock: 0`. Guessing someone's stock would be
 * worse than leaving it empty: a wrong number quietly poisons every low-stock
 * warning and every reorder suggestion, while zero is obviously zero. Stock
 * arrives through the Restock screen as they buy.
 *
 * Prices are typical township retail prices and are meant to be edited. Costs
 * sit a realistic margin behind them, so stock value and profit are not zero
 * on day one.
 */
import type { CategoryKey, Family, Product, RecipeLine } from './types'
import { CATEGORIES } from './types'

/** A product before it becomes one: no icon (derived) and no stock (always 0). */
type Template = {
  id: string
  name: string
  detail: string
  category: CategoryKey
  price: number
  cost: number
  unit: string
  unitPlural: string
  packSize: number
  packLabel: string
  /** Ingredients are bought and used up, never rung up on their own. */
  sellable?: boolean
  icon?: string
  /** Sell-grid family and picker levels — see Product. */
  family?: Family
  variant?: string
  menu?: string
  size?: string
  priceOptions?: number[]
  untracked?: boolean
}

export type PackKey = 'drinks' | 'snacks' | 'bread' | 'groceries' | 'sweets' | 'airtime' | 'kotas'

export type StarterPack = {
  key: PackKey
  label: string
  /** One line on the chip, so the choice is concrete rather than a category name. */
  blurb: string
  icon: string
  products: Template[]
}

// ---------------------------------------------------------------------------
// Packs
// ---------------------------------------------------------------------------

const DRINKS: Template[] = [
  { id: 'coke-can', name: 'Coca-Cola 330ml', detail: 'Cold drink, can', category: 'beverages', price: 13, cost: 9.5, unit: 'can', unitPlural: 'cans', packSize: 24, packLabel: 'tray of 24', family: 'colddrink', variant: 'Coke', size: 'can' },
  { id: 'coke-2l', name: 'Coca-Cola 2L', detail: 'Cold drink, bottle', category: 'beverages', price: 30, cost: 24, unit: 'bottle', unitPlural: 'bottles', packSize: 6, packLabel: 'case of 6', family: 'colddrink', variant: 'Coke', size: '2L' },
  { id: 'fanta-300', name: 'Fanta Orange 300ml', detail: 'Cold drink, bottle', category: 'beverages', price: 11, cost: 8, unit: 'bottle', unitPlural: 'bottles', packSize: 24, packLabel: 'case of 24', family: 'colddrink', variant: 'Fanta', size: '300ml' },
  { id: 'water-500', name: 'Still Water 500ml', detail: 'Bottled water', category: 'beverages', price: 9, cost: 5.5, unit: 'bottle', unitPlural: 'bottles', packSize: 24, packLabel: 'case of 24' },
  { id: 'energy-440', name: 'Energy Drink 440ml', detail: 'Can', category: 'beverages', price: 16, cost: 11, unit: 'can', unitPlural: 'cans', packSize: 24, packLabel: 'tray of 24' },
  { id: 'juice-200', name: 'Juice Blend 200ml', detail: 'Carton', category: 'beverages', price: 8, cost: 5, unit: 'box', unitPlural: 'boxes', packSize: 24, packLabel: 'case of 24' },
]

const SNACKS: Template[] = [
  { id: 'chips-36', name: 'Potato Chips 36g', detail: 'Single bag', category: 'pantry', price: 9, cost: 6, unit: 'bag', unitPlural: 'bags', packSize: 48, packLabel: 'box of 48', icon: 'fastfood' },
  { id: 'corn-snack-55', name: 'Corn Snack 55g', detail: 'Single bag', category: 'pantry', price: 11, cost: 7.5, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'fastfood' },
  { id: 'chips-125', name: 'Potato Chips 125g', detail: 'Sharing bag', category: 'pantry', price: 22, cost: 16.5, unit: 'bag', unitPlural: 'bags', packSize: 12, packLabel: 'box of 12', icon: 'fastfood' },
  { id: 'peanuts-50', name: 'Peanuts & Raisins 50g', detail: 'Single bag', category: 'pantry', price: 9, cost: 6, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'fastfood' },
  { id: 'biscuits-150', name: 'Biscuits 150g', detail: 'Pack', category: 'pantry', price: 15, cost: 10.5, unit: 'pack', unitPlural: 'packs', packSize: 12, packLabel: 'box of 12', icon: 'cookie' },
]

const BREAD: Template[] = [
  { id: 'bread', name: 'White Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 18, cost: 14, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'White' },
  { id: 'brown-bread', name: 'Brown Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 17, cost: 13, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'Brown' },
  { id: 'milk', name: 'Fresh Milk 1L', detail: 'Full cream sachet', category: 'dairy', price: 17, cost: 13.5, unit: 'sachet', unitPlural: 'sachets', packSize: 20, packLabel: 'crate of 20' },
  { id: 'eggs', name: 'Eggs 6-pack', detail: 'Large, for resale', category: 'dairy', price: 23, cost: 17, unit: 'pack', unitPlural: 'packs', packSize: 10, packLabel: 'box of 10' },
  { id: 'amasi', name: 'Amasi 2L', detail: 'Cultured milk', category: 'dairy', price: 38, cost: 31, unit: 'bottle', unitPlural: 'bottles', packSize: 6, packLabel: 'case of 6' },
  { id: 'margarine-500', name: 'Margarine 500g', detail: 'Tub', category: 'dairy', price: 28, cost: 22, unit: 'tub', unitPlural: 'tubs', packSize: 12, packLabel: 'box of 12' },
]

const GROCERIES: Template[] = [
  { id: 'maize', name: 'Maize Meal 2.5kg', detail: 'Super maize', category: 'pantry', price: 35, cost: 27, unit: 'bag', unitPlural: 'bags', packSize: 5, packLabel: 'bale of 5' },
  { id: 'rice', name: 'Rice 2kg', detail: 'Long grain', category: 'pantry', price: 48, cost: 39, unit: 'bag', unitPlural: 'bags', packSize: 5, packLabel: 'bale of 5' },
  { id: 'oil', name: 'Cooking Oil 750ml', detail: 'Sunflower', category: 'pantry', price: 32, cost: 25, unit: 'bottle', unitPlural: 'bottles', packSize: 12, packLabel: 'case of 12' },
  { id: 'sugar', name: 'Sugar 1kg', detail: 'White', category: 'pantry', price: 27, cost: 21, unit: 'bag', unitPlural: 'bags', packSize: 10, packLabel: 'bale of 10' },
  { id: 'salt', name: 'Salt 500g', detail: 'Table salt', category: 'pantry', price: 11, cost: 7, unit: 'pack', unitPlural: 'packs', packSize: 20, packLabel: 'box of 20' },
  { id: 'pilchards', name: 'Tinned Pilchards 400g', detail: 'In tomato sauce', category: 'pantry', price: 30, cost: 24, unit: 'tin', unitPlural: 'tins', packSize: 12, packLabel: 'case of 12' },
  { id: 'tea', name: 'Tea Bags 26s', detail: 'Rooibos or black', category: 'pantry', price: 22, cost: 16, unit: 'box', unitPlural: 'boxes', packSize: 12, packLabel: 'case of 12' },
]

const SWEETS: Template[] = [
  { id: 'bubblegum', name: 'Bubblegum', detail: 'Single piece', category: 'pantry', price: 1, cost: 0.55, unit: 'piece', unitPlural: 'pieces', packSize: 100, packLabel: 'tub of 100', icon: 'cookie' },
  { id: 'lollipop', name: 'Lollipop', detail: 'Single', category: 'pantry', price: 2, cost: 1.2, unit: 'lolly', unitPlural: 'lollies', packSize: 50, packLabel: 'box of 50', icon: 'cookie' },
  { id: 'chocolate-48', name: 'Chocolate Bar 48g', detail: 'Single bar', category: 'pantry', price: 16, cost: 12, unit: 'bar', unitPlural: 'bars', packSize: 24, packLabel: 'box of 24', icon: 'cookie' },
  { id: 'sweets-100', name: 'Mixed Sweets 100g', detail: 'Bag', category: 'pantry', price: 12, cost: 8, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'cookie' },
]

// Airtime margins are thin and set by the network, so these costs are the real
// thing rather than a guess: about 4% of face value. One product per network,
// with the amount picked at the counter becoming the line price — a spaza sells
// every network, and one product per amount would be twenty tiles.
const AIRTIME_AMOUNTS = [5, 10, 12, 29, 50]
const network = (id: string, name: string): Template => ({
  id,
  name: `${name} airtime`,
  detail: 'Voucher',
  category: 'other',
  price: AIRTIME_AMOUNTS[0],
  cost: 4.8,
  unit: 'voucher',
  unitPlural: 'vouchers',
  packSize: 1,
  packLabel: 'single voucher',
  family: 'airtime',
  variant: name,
  priceOptions: AIRTIME_AMOUNTS,
  untracked: true,
})
const AIRTIME: Template[] = [
  network('airtime-vodacom', 'Vodacom'),
  network('airtime-mtn', 'MTN'),
  network('airtime-cellc', 'Cell C'),
  network('airtime-telkom', 'Telkom'),
  { id: 'data-1gb', name: 'Data 1GB', detail: 'Voucher', category: 'other', price: 85, cost: 81.6, unit: 'voucher', unitPlural: 'vouchers', packSize: 1, packLabel: 'single voucher', untracked: true },
]

// ---------------------------------------------------------------------------
// Kotas
// ---------------------------------------------------------------------------

/**
 * What a kota is built from. These are bought by the bag, tub or kilo and used
 * up a little at a time, so they are stock but not sellable — except the loaf,
 * which a spaza sells whole as well.
 *
 * Quantities in the builds below are per kota, in these units.
 */
const KOTA_INGREDIENTS: Template[] = [
  // The same loaf as the bread pack, on purpose: a quarter loaf is a quarter
  // of the stock the shop already counts.
  { id: 'bread', name: 'White Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 18, cost: 14, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'White' },
  { id: 'fries', name: 'Frozen Chips', detail: 'For frying', category: 'ingredients', price: 0, cost: 32, unit: 'kg', unitPlural: 'kg', packSize: 2, packLabel: 'bag of 2kg', sellable: false },
  { id: 'polony', name: 'Polony', detail: 'Sliced', category: 'ingredients', price: 0, cost: 55, unit: 'kg', unitPlural: 'kg', packSize: 1, packLabel: 'roll of 1kg', sellable: false },
  { id: 'cheese-slice', name: 'Cheese Slices', detail: 'Processed, singles', category: 'ingredients', price: 0, cost: 2.1, unit: 'slice', unitPlural: 'slices', packSize: 24, packLabel: 'pack of 24', sellable: false },
  { id: 'russian', name: 'Russian Sausage', detail: 'Frozen', category: 'ingredients', price: 0, cost: 9.5, unit: 'sausage', unitPlural: 'sausages', packSize: 20, packLabel: 'pack of 20', sellable: false },
  { id: 'vienna', name: 'Vienna Sausage', detail: 'Frozen', category: 'ingredients', price: 0, cost: 4.2, unit: 'vienna', unitPlural: 'viennas', packSize: 24, packLabel: 'pack of 24', sellable: false },
  { id: 'egg-single', name: 'Eggs (tray)', detail: 'For frying, not for resale', category: 'ingredients', price: 0, cost: 3.1, unit: 'egg', unitPlural: 'eggs', packSize: 30, packLabel: 'tray of 30', sellable: false },
  { id: 'atchar', name: 'Mango Atchar', detail: 'Tub', category: 'ingredients', price: 0, cost: 68, unit: 'kg', unitPlural: 'kg', packSize: 1, packLabel: 'tub of 1kg', sellable: false },
]

export type KotaBuild = {
  id: string
  name: string
  detail: string
  /** Typical street price. Always shown, always editable afterwards. */
  price: number
  recipe: RecipeLine[]
}

/**
 * The builds people actually order. Ticking one seeds the kota itself, its
 * recipe, and every ingredient the recipe needs — which is the whole point:
 * one tap sets up a composite product that would otherwise take ten minutes.
 */
export const KOTA_BUILDS: KotaBuild[] = [
  {
    id: 'kota-chips',
    name: 'Chip Kota',
    detail: 'Quarter loaf, chips, atchar',
    price: 20,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'fries', qty: 0.15 },
      { productId: 'atchar', qty: 0.02 },
    ],
  },
  {
    id: 'kota-special',
    name: 'Kota Special',
    detail: 'Quarter loaf, chips, polony, cheese, atchar',
    price: 35,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'fries', qty: 0.15 },
      { productId: 'polony', qty: 0.05 },
      { productId: 'cheese-slice', qty: 1 },
      { productId: 'atchar', qty: 0.02 },
    ],
  },
  {
    id: 'kota-cheese',
    name: 'Cheese Kota',
    detail: 'Quarter loaf, chips, double cheese, atchar',
    price: 25,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'fries', qty: 0.15 },
      { productId: 'cheese-slice', qty: 2 },
      { productId: 'atchar', qty: 0.02 },
    ],
  },
  {
    id: 'kota-egg',
    name: 'Egg Kota',
    detail: 'Quarter loaf, chips, fried egg, cheese',
    price: 28,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'fries', qty: 0.15 },
      { productId: 'egg-single', qty: 1 },
      { productId: 'cheese-slice', qty: 1 },
      { productId: 'atchar', qty: 0.02 },
    ],
  },
  {
    id: 'kota-full-house',
    name: 'Full House',
    detail: 'The lot — russian, vienna, egg, polony, cheese',
    price: 50,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'fries', qty: 0.15 },
      { productId: 'polony', qty: 0.05 },
      { productId: 'cheese-slice', qty: 1 },
      { productId: 'russian', qty: 1 },
      { productId: 'vienna', qty: 1 },
      { productId: 'egg-single', qty: 1 },
      { productId: 'atchar', qty: 0.02 },
    ],
  },
  {
    id: 'russian-chips',
    name: 'Russian & Chips',
    detail: 'No bread — a russian with a portion of chips',
    price: 30,
    recipe: [
      { productId: 'russian', qty: 1 },
      { productId: 'fries', qty: 0.2 },
    ],
  },
]

export const PACKS: StarterPack[] = [
  { key: 'drinks', label: 'Cold drinks', blurb: 'Coke, water, energy drinks', icon: 'local_bar', products: DRINKS },
  { key: 'snacks', label: 'Snacks & chips', blurb: 'Chips, corn snacks, peanuts', icon: 'fastfood', products: SNACKS },
  { key: 'bread', label: 'Bread & dairy', blurb: 'Bread, milk, eggs, amasi', icon: 'bakery_dining', products: BREAD },
  { key: 'groceries', label: 'Groceries', blurb: 'Maize, rice, oil, sugar', icon: 'grain', products: GROCERIES },
  { key: 'sweets', label: 'Sweets', blurb: 'Bubblegum, lollies, chocolate', icon: 'cookie', products: SWEETS },
  { key: 'airtime', label: 'Airtime & data', blurb: 'Vouchers you sell on', icon: 'sell', products: AIRTIME },
  // No products of its own: the kota step decides what this one seeds
  { key: 'kotas', label: 'Kotas & hot food', blurb: 'Pick the ones you make', icon: 'lunch_dining', products: [] },
]

// ---------------------------------------------------------------------------
// Building the catalogue
// ---------------------------------------------------------------------------

export type StarterSelection = {
  packs: PackKey[]
  /** Ids from KOTA_BUILDS. Only read when `packs` includes `kotas`. */
  kotas: string[]
}

const iconFor = (category: CategoryKey) => CATEGORIES.find((c) => c.key === category)?.icon ?? 'inventory_2'

function toProduct(t: Template): Product {
  return {
    id: t.id,
    name: t.name,
    detail: t.detail,
    category: t.category,
    icon: t.icon ?? iconFor(t.category),
    sellable: t.sellable ?? true,
    price: t.price,
    cost: t.cost,
    unit: t.unit,
    unitPlural: t.unitPlural,
    // Nothing is counted yet; the Restock screen fills this in as stock arrives
    stock: 0,
    packSize: t.packSize,
    packLabel: t.packLabel,
    ...(t.family ? { family: t.family, variant: t.variant } : {}),
    ...(t.menu ? { menu: t.menu } : {}),
    ...(t.size ? { size: t.size } : {}),
    ...(t.priceOptions ? { priceOptions: t.priceOptions } : {}),
    ...(t.untracked ? { untracked: true } : {}),
  }
}

/**
 * The catalogue for a selection, in a sensible order: everyday stock first,
 * then the ingredients, then the kotas built from them.
 *
 * Ids are shared on purpose — the loaf in the bread pack and the loaf a kota is
 * cut from are one product — so the first template to claim an id wins and the
 * rest are dropped.
 */
export function buildStarterCatalogue(sel: StarterSelection): Product[] {
  const byId = new Map<string, Product>()
  const add = (t: Template) => {
    if (!byId.has(t.id)) byId.set(t.id, toProduct(t))
  }

  for (const pack of PACKS) {
    if (sel.packs.includes(pack.key)) pack.products.forEach(add)
  }

  if (!sel.packs.includes('kotas') || sel.kotas.length === 0) return [...byId.values()]

  const builds = KOTA_BUILDS.filter((b) => sel.kotas.includes(b.id))

  // Ingredients first, so a recipe never points at a product that is not in the
  // catalogue yet and the cost below can be worked out from them
  const needed = new Set(builds.flatMap((b) => b.recipe.map((l) => l.productId)))
  KOTA_INGREDIENTS.filter((t) => needed.has(t.id)).forEach(add)

  for (const build of builds) {
    const cost = build.recipe.reduce((sum, line) => {
      const ingredient = byId.get(line.productId)
      return sum + (ingredient ? ingredient.cost * line.qty : 0)
    }, 0)
    byId.set(build.id, {
      id: build.id,
      name: build.name,
      detail: build.detail,
      category: 'hot',
      icon: 'lunch_dining',
      sellable: true,
      price: build.price,
      cost: Math.round(cost * 100) / 100,
      unit: 'kota',
      unitPlural: 'kotas',
      // Composite stock is derived from the ingredients, never counted
      stock: 0,
      packSize: 1,
      packLabel: 'made to order',
      composite: true,
      recipe: build.recipe,
      // Its own tile on Sell, named like everything else the owner makes
      menu: 'Kota',
    })
  }

  return [...byId.values()]
}

/** How many products a selection will create, for the label on the last step. */
export const starterCatalogueSize = (sel: StarterSelection) => buildStarterCatalogue(sel).length
