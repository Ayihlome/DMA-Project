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
 * are not filled in: what this shop pays is only known once the owner types
 * it, so every item starts with an unknown cost (0) and Profit says so.
 */
import type { CategoryKey, Family, Portion, Product, RecipeLine } from './types'
import { CATEGORIES } from './types'
import { recipeCost } from './inventory'

/** A product before it becomes one: no icon (derived) and no stock (always 0). */
type Template = {
  id: string
  name: string
  detail: string
  category: CategoryKey
  price: number
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
  portion?: Portion
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
  { id: 'coke-can', name: 'Coke can', detail: 'Cold drink, 330ml can', category: 'beverages', price: 13, unit: 'can', unitPlural: 'cans', packSize: 24, packLabel: 'tray of 24', family: 'colddrink', variant: 'Coke', size: 'can' },
  { id: 'coke-2l', name: 'Coke 2L', detail: 'Cold drink, 2L bottle', category: 'beverages', price: 30, unit: 'bottle', unitPlural: 'bottles', packSize: 6, packLabel: 'case of 6', family: 'colddrink', variant: 'Coke', size: '2L' },
  { id: 'fanta-300', name: 'Fanta 300ml', detail: 'Cold drink, orange, 300ml bottle', category: 'beverages', price: 11, unit: 'bottle', unitPlural: 'bottles', packSize: 24, packLabel: 'case of 24', family: 'colddrink', variant: 'Fanta', size: '300ml' },
  { id: 'water-500', name: 'Still Water 500ml', detail: 'Bottled water', category: 'beverages', price: 9, unit: 'bottle', unitPlural: 'bottles', packSize: 24, packLabel: 'case of 24' },
  { id: 'energy-440', name: 'Energy Drink 440ml', detail: 'Can', category: 'beverages', price: 16, unit: 'can', unitPlural: 'cans', packSize: 24, packLabel: 'tray of 24' },
  { id: 'juice-200', name: 'Juice Blend 200ml', detail: 'Carton', category: 'beverages', price: 8, unit: 'box', unitPlural: 'boxes', packSize: 24, packLabel: 'case of 24' },
]

const SNACKS: Template[] = [
  { id: 'chips-36', name: 'Potato Chips 36g', detail: 'Single bag', category: 'pantry', price: 9, unit: 'bag', unitPlural: 'bags', packSize: 48, packLabel: 'box of 48', icon: 'fastfood' },
  { id: 'corn-snack-55', name: 'Corn Snack 55g', detail: 'Single bag', category: 'pantry', price: 11, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'fastfood' },
  { id: 'chips-125', name: 'Potato Chips 125g', detail: 'Sharing bag', category: 'pantry', price: 22, unit: 'bag', unitPlural: 'bags', packSize: 12, packLabel: 'box of 12', icon: 'fastfood' },
  { id: 'peanuts-50', name: 'Peanuts & Raisins 50g', detail: 'Single bag', category: 'pantry', price: 9, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'fastfood' },
  { id: 'biscuits-150', name: 'Biscuits 150g', detail: 'Pack', category: 'pantry', price: 15, unit: 'pack', unitPlural: 'packs', packSize: 12, packLabel: 'box of 12', icon: 'cookie' },
]

const BREAD: Template[] = [
  { id: 'bread', name: 'White Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 18, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'White' },
  { id: 'brown-bread', name: 'Brown Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 17, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'Brown' },
  { id: 'milk', name: 'Fresh Milk 1L', detail: 'Full cream sachet', category: 'dairy', price: 17, unit: 'sachet', unitPlural: 'sachets', packSize: 20, packLabel: 'crate of 20' },
  { id: 'eggs', name: 'Eggs 6-pack', detail: 'Large, for resale', category: 'dairy', price: 23, unit: 'pack', unitPlural: 'packs', packSize: 10, packLabel: 'box of 10' },
  { id: 'amasi', name: 'Amasi 2L', detail: 'Cultured milk', category: 'dairy', price: 38, unit: 'bottle', unitPlural: 'bottles', packSize: 6, packLabel: 'case of 6' },
  { id: 'margarine-500', name: 'Margarine 500g', detail: 'Tub', category: 'dairy', price: 28, unit: 'tub', unitPlural: 'tubs', packSize: 12, packLabel: 'box of 12' },
]

const GROCERIES: Template[] = [
  { id: 'maize', name: 'Maize Meal 2.5kg', detail: 'Super maize', category: 'pantry', price: 35, unit: 'bag', unitPlural: 'bags', packSize: 5, packLabel: 'bale of 5' },
  { id: 'rice', name: 'Rice 2kg', detail: 'Long grain', category: 'pantry', price: 48, unit: 'bag', unitPlural: 'bags', packSize: 5, packLabel: 'bale of 5' },
  { id: 'oil', name: 'Cooking Oil 750ml', detail: 'Sunflower', category: 'pantry', price: 32, unit: 'bottle', unitPlural: 'bottles', packSize: 12, packLabel: 'case of 12' },
  { id: 'sugar', name: 'Sugar 1kg', detail: 'White', category: 'pantry', price: 27, unit: 'bag', unitPlural: 'bags', packSize: 10, packLabel: 'bale of 10' },
  { id: 'salt', name: 'Salt 500g', detail: 'Table salt', category: 'pantry', price: 11, unit: 'pack', unitPlural: 'packs', packSize: 20, packLabel: 'box of 20' },
  { id: 'pilchards', name: 'Tinned Pilchards 400g', detail: 'In tomato sauce', category: 'pantry', price: 30, unit: 'tin', unitPlural: 'tins', packSize: 12, packLabel: 'case of 12' },
  { id: 'tea', name: 'Tea Bags 26s', detail: 'Rooibos or black', category: 'pantry', price: 22, unit: 'box', unitPlural: 'boxes', packSize: 12, packLabel: 'case of 12' },
]

const SWEETS: Template[] = [
  { id: 'bubblegum', name: 'Bubblegum', detail: 'Single piece', category: 'pantry', price: 1, unit: 'piece', unitPlural: 'pieces', packSize: 100, packLabel: 'tub of 100', icon: 'cookie' },
  { id: 'lollipop', name: 'Lollipop', detail: 'Single', category: 'pantry', price: 2, unit: 'lolly', unitPlural: 'lollies', packSize: 50, packLabel: 'box of 50', icon: 'cookie' },
  { id: 'chocolate-48', name: 'Chocolate Bar 48g', detail: 'Single bar', category: 'pantry', price: 16, unit: 'bar', unitPlural: 'bars', packSize: 24, packLabel: 'box of 24', icon: 'cookie' },
  { id: 'sweets-100', name: 'Mixed Sweets 100g', detail: 'Bag', category: 'pantry', price: 12, unit: 'bag', unitPlural: 'bags', packSize: 24, packLabel: 'box of 24', icon: 'cookie' },
]

// One product per network, with the amount picked at the counter becoming the
// line price — a spaza sells every network, and one product per amount would be
// twenty tiles.
//
// Follow-up: airtime cost is unknown, like every starter cost. It used to be a
// guessed 96% of face value (about 4% kept). Fill it in only once the real
// commission each network or reseller pays a spaza has been sourced.
const AIRTIME_AMOUNTS = [5, 10, 12, 29, 50]
const network = (id: string, name: string): Template => ({
  id,
  name: `${name} airtime`,
  detail: 'Voucher',
  category: 'other',
  price: AIRTIME_AMOUNTS[0],
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
  { id: 'data-1gb', name: 'Data 1GB', detail: 'Voucher', category: 'other', price: 85, unit: 'voucher', unitPlural: 'vouchers', packSize: 1, packLabel: 'single voucher', untracked: true },
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
  { id: 'bread', name: 'White Bread 700g', detail: 'Sliced loaf', category: 'bakery', price: 18, unit: 'loaf', unitPlural: 'loaves', packSize: 10, packLabel: 'crate of 10', family: 'bread', variant: 'White' },
  { id: 'fries', name: 'Frozen Chips', detail: 'For frying', category: 'ingredients', price: 0, unit: 'kg', unitPlural: 'kg', packSize: 2, packLabel: 'bag of 2kg', sellable: false },
  { id: 'polony', name: 'Polony', detail: 'Sliced', category: 'ingredients', price: 0, unit: 'kg', unitPlural: 'kg', packSize: 1, packLabel: 'roll of 1kg', sellable: false },
  { id: 'cheese-slice', name: 'Cheese Slices', detail: 'Processed, singles', category: 'ingredients', price: 0, unit: 'slice', unitPlural: 'slices', packSize: 24, packLabel: 'pack of 24', sellable: false },
  { id: 'russian', name: 'Russian Sausage', detail: 'Frozen', category: 'ingredients', price: 0, unit: 'sausage', unitPlural: 'sausages', packSize: 20, packLabel: 'pack of 20', sellable: false },
  { id: 'vienna', name: 'Vienna Sausage', detail: 'Frozen', category: 'ingredients', price: 0, unit: 'vienna', unitPlural: 'viennas', packSize: 24, packLabel: 'pack of 24', sellable: false },
  { id: 'egg-single', name: 'Eggs (tray)', detail: 'For frying, not for resale', category: 'ingredients', price: 0, unit: 'egg', unitPlural: 'eggs', packSize: 30, packLabel: 'tray of 30', sellable: false },
  { id: 'atchar', name: 'Mango Atchar', detail: 'Tub', category: 'ingredients', price: 0, unit: 'kg', unitPlural: 'kg', packSize: 1, packLabel: 'tub of 1kg', sellable: false },
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
  /** Pack items the owner unticked: they don't sell it. */
  exclude?: string[]
  /** The owner's own selling prices, by product id (pack items and kotas). */
  prices?: Record<string, number>
  /** Things the shop sells that no pack has. */
  extras?: ExtraItem[]
  /** How the kitchen makes its kotas; sets the recipe amounts. */
  kitchen?: KitchenAnswers
}

export type ExtraItem = { name: string; price: number }

// ---------------------------------------------------------------------------
// How the kitchen makes it
// ---------------------------------------------------------------------------

/**
 * Recipe amounts asked in the owner's own terms — "a loaf makes 4 kotas", not
 * "0.25 loaf". Only the fuzzy ingredients are asked: a russian is one russian,
 * and asking would only slow setup down. Each answer scales that ingredient in
 * every kota by the same amount, so a Cheese Kota keeps twice the cheese of a
 * Kota Special.
 *
 * `standard` is the amount in a normal kota (in stock units), and the answer
 * is turned back into one: "makes" = `base` ÷ answer, "each" = the answer.
 */
export type KitchenQuestion = {
  id: string
  kind: 'makes' | 'each'
  /** "One loaf makes about" / "Cheese slices on a kota". */
  label: string
  /** What the number counts: "kotas", "slices". */
  after: string
  standard: number
  /** Stock units the "makes" answer is out of: 1 loaf, 1 kg roll. */
  base: number
}

export const KITCHEN_QUESTIONS: KitchenQuestion[] = [
  { id: 'bread', kind: 'makes', label: 'One loaf makes about', after: 'kotas', standard: 0.25, base: 1 },
  { id: 'polony', kind: 'makes', label: 'A 1 kg roll of polony does about', after: 'kotas', standard: 0.05, base: 1 },
  { id: 'cheese-slice', kind: 'each', label: 'Cheese slices on a normal kota', after: 'slices', standard: 1, base: 1 },
  { id: 'atchar', kind: 'makes', label: 'A 1 kg tub of atchar does about', after: 'kotas', standard: 0.02, base: 1 },
]

/** Chips are asked apart: bought cut and frozen, or cut from potatoes in the shop. */
export type ChipsAnswer =
  | { mode: 'bag'; kotasPerBag: number }
  | { mode: 'potato'; chipsPerPotato: number; chipsPerKota: number; potatoesPerBag: number }

export type KitchenAnswers = {
  /** By KitchenQuestion id: the number the owner gave. */
  answers?: Record<string, number>
  chips?: ChipsAnswer
}

/** A normal kota's chips in the recipes below, and the frozen bag they come from. */
const CHIPS_STANDARD = 0.15
const CHIPS_BAG_KG = 2

/** The answers that leave the recipes as they are — what the questions start filled in with. */
export function defaultKitchen(): Required<KitchenAnswers> {
  const answers: Record<string, number> = {}
  for (const q of KITCHEN_QUESTIONS) answers[q.id] = Math.round(q.kind === 'makes' ? q.base / q.standard : q.standard)
  return { answers, chips: { mode: 'bag', kotasPerBag: Math.round(CHIPS_BAG_KG / CHIPS_STANDARD) } }
}

/**
 * Starting numbers when the owner says they cut their own: the ones a kota stand
 * owner gave as an example. Shown in the fields, always meant to be changed.
 */
export const POTATO_DEFAULTS = { chipsPerPotato: 5, chipsPerKota: 10, potatoesPerBag: 30 }

/** How much more (or less) of an ingredient the owner's answer means, against the recipes as written. */
function factorFor(q: KitchenQuestion, answer: number | undefined) {
  if (!(answer && answer > 0)) return 1
  return (q.kind === 'makes' ? q.base / answer : answer) / q.standard
}

const round4 = (n: number) => Math.round(n * 10000) / 10000

/** One build's recipe as this kitchen makes it. Potato chips swap the frozen chips for potatoes. */
function kitchenRecipe(recipe: RecipeLine[], k: KitchenAnswers | undefined): RecipeLine[] {
  if (!k) return recipe
  return recipe.map((l) => {
    if (l.productId === 'fries' && k.chips) {
      // This kota's chips against a normal one: Russian & Chips gets a bigger portion
      const share = l.qty / CHIPS_STANDARD
      if (k.chips.mode === 'potato') {
        const { chipsPerKota, chipsPerPotato } = k.chips
        return { productId: 'potato', qty: round4((share * chipsPerKota) / Math.max(1, chipsPerPotato)) }
      }
      return { productId: 'fries', qty: round4((share * CHIPS_BAG_KG) / Math.max(1, k.chips.kotasPerBag)) }
    }
    const q = KITCHEN_QUESTIONS.find((x) => x.id === l.productId)
    return q ? { ...l, qty: round4(l.qty * factorFor(q, k.answers?.[q.id])) } : l
  })
}

/** Potatoes, sized the way the owner described them: counted whole, served as chips. */
function potatoTemplate(c: Extract<ChipsAnswer, { mode: 'potato' }>): Template {
  const perBag = Math.max(1, Math.round(c.potatoesPerBag))
  return {
    id: 'potato',
    name: 'Potatoes',
    detail: 'For cutting chips',
    category: 'ingredients',
    price: 0,
    unit: 'potato',
    unitPlural: 'potatoes',
    packSize: perBag,
    packLabel: `bag of ${perBag}`,
    sellable: false,
    portion: { name: 'chip', plural: 'chips', perUnit: Math.max(1, c.chipsPerPotato) },
  }
}

const slug = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** One of the owner's own items: sold as it is, counted one at a time. */
function extraTemplate(e: ExtraItem, i: number): Template {
  return {
    id: `own-${slug(e.name) || i}`,
    name: e.name.trim(),
    detail: 'Added by you',
    category: 'other',
    price: Math.max(0, e.price),
    unit: 'item',
    unitPlural: 'items',
    packSize: 1,
    packLabel: 'single item',
  }
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
    // Unknown until the owner says what they pay
    cost: 0,
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
    ...(t.portion ? { portion: t.portion } : {}),
    template: t.id,
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

  const excluded = new Set(sel.exclude ?? [])
  for (const pack of PACKS) {
    if (sel.packs.includes(pack.key)) pack.products.filter((t) => !excluded.has(t.id)).forEach(add)
  }
  ;(sel.extras ?? []).filter((e) => e.name.trim()).forEach((e, i) => add(extraTemplate(e, i)))

  const finish = () => withPrices([...byId.values()], sel.prices)
  if (!sel.packs.includes('kotas') || sel.kotas.length === 0) return finish()

  const builds = KOTA_BUILDS.filter((b) => sel.kotas.includes(b.id)).map((b) => ({
    ...b,
    recipe: kitchenRecipe(b.recipe, sel.kitchen),
  }))

  // Ingredients first, so a recipe never points at a product that is not in the
  // catalogue yet and the cost below can be worked out from them
  const needed = new Set(builds.flatMap((b) => b.recipe.map((l) => l.productId)))
  const chips = sel.kitchen?.chips
  const ingredients = [...KOTA_INGREDIENTS, ...(chips?.mode === 'potato' ? [potatoTemplate(chips)] : [])]
  for (const t of ingredients.filter((x) => needed.has(x.id))) {
    // A loaf unticked in the bread pack is still cut for kotas — just not sold whole
    add(excluded.has(t.id) ? { ...t, sellable: false } : t)
  }

  for (const build of builds) {
    byId.set(build.id, {
      id: build.id,
      name: build.name,
      detail: build.detail,
      category: 'hot',
      icon: 'lunch_dining',
      sellable: true,
      price: build.price,
      // Unknown while any ingredient's cost is unknown, which is all of them at setup
      cost: recipeCost(build.recipe, (id) => byId.get(id)?.cost),
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
      template: build.id,
      // The app's standard recipe until the owner saves it
      recipeChecked: false,
    })
  }

  return finish()
}

/** The owner's own selling prices over the usual ones. Airtime's price is the amount picked at the counter, so it is left alone. */
function withPrices(products: Product[], prices: Record<string, number> | undefined): Product[] {
  if (!prices) return products
  return products.map((p) => {
    const price = prices[p.id]
    return price !== undefined && Number.isFinite(price) && price >= 0 && !p.priceOptions ? { ...p, price } : p
  })
}

/**
 * The "Add common brands?" offer: the bread and cold drinks that share a Sell
 * tile, as product inputs, minus any the shop already has. Only ever added when
 * the owner says yes — a real shop's catalogue is theirs.
 */
export function commonBrands(existing: Product[]): ProductInputLike[] {
  const have = new Set(existing.map((p) => p.name.toLowerCase()))
  return [...BREAD, ...DRINKS]
    .filter((t) => (t.family === 'bread' || t.family === 'colddrink') && !have.has(t.name.toLowerCase()))
    .map((t) => ({
      name: t.name,
      detail: t.detail,
      category: t.category,
      price: t.price,
      stock: 0,
      unit: t.unit,
      unitPlural: t.unitPlural,
      packSize: t.packSize,
      packName: t.packLabel.split(/\s+/)[0],
      family: t.family as 'bread' | 'colddrink',
      variant: t.variant,
      size: t.size,
    }))
}

/** Mirrors ProductInput in actions.ts, which imports this file. */
type ProductInputLike = {
  name: string
  detail?: string
  category: CategoryKey
  price: number
  cost?: number
  stock: number
  unit: string
  unitPlural: string
  packSize: number
  packName?: string
  family?: 'bread' | 'colddrink' | null
  variant?: string
  size?: string
}

/** How many products a selection will create, for the label on the last step. */
export const starterCatalogueSize = (sel: StarterSelection) => buildStarterCatalogue(sel).length
