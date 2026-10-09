import type { AppState, Product, Purchase, Sale, Supplier, SupplierPrice } from './types'

const photo = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=300&q=70`

export const PRODUCTS: Product[] = [
  {
    id: 'bread',
    name: 'White Bread 700g',
    detail: 'Albany, sliced',
    category: 'bakery',
    icon: 'bakery_dining',
    image: photo('photo-1598373182308-3270495d2f58'),
    sellable: true,
    price: 17,
    cost: 13.2,
    unit: 'loaf',
    unitPlural: 'loaves',
    stock: 2,
    packSize: 10,
    packLabel: 'crate of 10',
  },
  {
    id: 'milk',
    name: 'Fresh Milk 1L',
    detail: 'Full cream sachet',
    category: 'dairy',
    icon: 'local_drink',
    image: photo('photo-1553301803-768cd4a59b9c'),
    sellable: true,
    price: 15.5,
    cost: 12.5,
    unit: 'sachet',
    unitPlural: 'sachets',
    stock: 4,
    packSize: 20,
    packLabel: 'crate of 20',
  },
  {
    id: 'coke',
    name: 'Coca-Cola 330ml',
    detail: 'Cold drink, can',
    category: 'beverages',
    icon: 'local_bar',
    image: photo('photo-1622483767028-3f66f32aef97'),
    sellable: true,
    price: 13,
    cost: 9,
    unit: 'can',
    unitPlural: 'cans',
    stock: 120,
    packSize: 24,
    packLabel: 'tray of 24',
  },
  {
    id: 'kota',
    name: 'Kota Special',
    detail: 'Quarter loaf, chips, polony, cheese',
    category: 'hot',
    icon: 'lunch_dining',
    image: photo('photo-1528279027-68f0d7fce9f1'),
    sellable: true,
    price: 35,
    cost: 0,
    unit: 'kota',
    unitPlural: 'kotas',
    stock: 0,
    packSize: 1,
    packLabel: 'made to order',
    composite: true,
    recipe: [
      { productId: 'bread', qty: 0.25 },
      { productId: 'polony', qty: 0.05 },
      { productId: 'cheese', qty: 1 },
      { productId: 'chips', qty: 0.1 },
    ],
  },
  {
    id: 'russian',
    name: 'Russian & Chips',
    detail: 'Russian sausage, chips',
    category: 'hot',
    icon: 'fastfood',
    image: photo('photo-1762284513031-3d7ad15562bc'),
    sellable: true,
    price: 28,
    cost: 0,
    unit: 'portion',
    unitPlural: 'portions',
    stock: 0,
    packSize: 1,
    packLabel: 'made to order',
    composite: true,
    recipe: null,
  },
  {
    id: 'eggs',
    name: 'Eggs 6-pack',
    detail: 'Large',
    category: 'dairy',
    icon: 'egg',
    image: photo('photo-1506976785307-8732e854ad03'),
    sellable: true,
    price: 22,
    cost: 15.5,
    unit: 'pack',
    unitPlural: 'packs',
    stock: 26,
    packSize: 10,
    packLabel: 'box of 10',
  },
  {
    id: 'maize',
    name: 'Maize Meal 2.5kg',
    detail: 'Iwisa Super Maize',
    category: 'pantry',
    icon: 'grain',
    image: photo('photo-1627735483792-233bf632619b'),
    sellable: true,
    price: 32,
    cost: 24.5,
    unit: 'bag',
    unitPlural: 'bags',
    stock: 6,
    packSize: 5,
    packLabel: 'bale of 5',
  },
  {
    id: 'oil',
    name: 'Sunflower Oil 750ml',
    detail: 'Clear PET bottle',
    category: 'pantry',
    icon: 'water_drop',
    image: photo('photo-1552592074-ea7a91b851b3'),
    sellable: true,
    price: 34,
    cost: 24.5,
    unit: 'bottle',
    unitPlural: 'bottles',
    stock: 5,
    packSize: 12,
    packLabel: 'case of 12',
  },
  {
    id: 'polony',
    name: 'Polony',
    detail: 'Kota ingredient',
    category: 'ingredients',
    icon: 'set_meal',
    sellable: false,
    price: 0,
    cost: 58,
    unit: 'kg',
    unitPlural: 'kg',
    stock: 3,
    packSize: 1,
    packLabel: '1 kg roll',
  },
  {
    id: 'cheese',
    name: 'Cheese slices',
    detail: 'Kota ingredient',
    category: 'ingredients',
    icon: 'kitchen',
    sellable: false,
    price: 0,
    cost: 1.2,
    unit: 'slice',
    unitPlural: 'slices',
    stock: 80,
    packSize: 40,
    packLabel: 'pack of 40',
  },
  {
    id: 'chips',
    name: 'Slap chips (frozen)',
    detail: 'Kota ingredient',
    category: 'ingredients',
    icon: 'skillet',
    sellable: false,
    price: 0,
    cost: 25,
    unit: 'kg',
    unitPlural: 'kg',
    stock: 8,
    packSize: 2.5,
    packLabel: '2.5 kg bag',
  },
]

export const SUPPLIERS: Supplier[] = [
  { id: 'jumbo', name: 'Jumbo Cash & Carry', location: 'Crown Mines · 4.2 km', contact: '011 555 0142' },
  { id: 'devland', name: 'Devland Mega Wholesale', location: 'Devland · 3.8 km' },
  { id: 'tiger', name: 'Tiger Brands Direct Depot', location: 'Industria · 9.1 km' },
]

// [productId, supplierId, unitPrice, minOrder]
const PRICE_ROWS: [string, string, number, number?][] = [
  ['bread', 'jumbo', 13.2, 20],
  ['bread', 'devland', 13.9, 10],
  ['bread', 'tiger', 14.5, 50],
  ['milk', 'devland', 12.5, 20],
  ['milk', 'jumbo', 12.95, 20],
  ['coke', 'jumbo', 9, 24],
  ['coke', 'devland', 9.4, 24],
  ['eggs', 'jumbo', 15.5, 10],
  ['eggs', 'devland', 16.2],
  ['maize', 'devland', 24.5, 5],
  ['maize', 'jumbo', 25.2, 5],
  ['oil', 'jumbo', 24.5, 12],
  ['oil', 'devland', 25.8, 12],
  ['polony', 'jumbo', 58, 1],
  ['polony', 'devland', 61],
  ['cheese', 'jumbo', 1.2, 40],
  ['cheese', 'devland', 1.32, 40],
  ['chips', 'jumbo', 25, 2.5],
  ['chips', 'devland', 26.5, 2.5],
]

// Average units sold per day, used to generate believable history.
const DAILY_RATE: Record<string, number> = { bread: 14, milk: 9, coke: 20, kota: 11, eggs: 5, maize: 2, oil: 1.5 }

const DAY = 86_400_000

// Deterministic PRNG so every new device seeds the same history.
function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function createSeedState(now = Date.now()): AppState {
  const rnd = mulberry32(20261009)
  const startOfToday = new Date(now).setHours(0, 0, 0, 0)

  const prices: SupplierPrice[] = PRICE_ROWS.map(([productId, supplierId, unitPrice, minOrder], i) => {
    const drift = [1.04, 1.02, 1.03, 1]
    return {
      id: `price-${i}`,
      supplierId,
      productId,
      unitPrice,
      minOrder,
      updatedAt: now - (1 + (i % 4)) * DAY,
      history: drift.map((f, j) => ({ at: now - (30 - j * 10) * DAY, price: round2(unitPrice * f) })),
    }
  })

  // Two sales batches per day (morning and afternoon) for the last 12 weeks.
  const sales: Sale[] = []
  for (let d = 83; d >= 0; d--) {
    const dayStart = startOfToday - d * DAY
    const wave = 1 + 0.22 * Math.sin((83 - d) / 5)
    for (const [slot, hour] of [
      [0, 9],
      [1, 15],
    ] as const) {
      const at = dayStart + hour * 3_600_000
      if (at > now) continue
      const lines = Object.entries(DAILY_RATE)
        .map(([productId, rate]) => {
          const qty = Math.max(0, Math.round((rate / 2) * wave * (0.7 + rnd() * 0.6)))
          const p = PRODUCTS.find((x) => x.id === productId)!
          return { productId, qty, price: p.price }
        })
        .filter((l) => l.qty > 0)
      sales.push({ id: `seed-sale-${d}-${slot}`, at, lines, total: round2(lines.reduce((s, l) => s + l.qty * l.price, 0)) })
    }
  }

  // Restock purchases every 4 days, rotating suppliers.
  const purchases: Purchase[] = []
  const rotation: [string, string[]][] = [
    ['jumbo', ['bread', 'coke', 'cheese']],
    ['devland', ['milk', 'maize', 'eggs']],
    ['jumbo', ['bread', 'oil', 'polony', 'chips']],
    ['tiger', ['bread']],
    ['devland', ['milk', 'bread', 'eggs']],
  ]
  let po = 1001
  for (let d = 82, i = 0; d >= 2; d -= 4, i++) {
    const [supplierId, items] = rotation[i % rotation.length]
    const lines = items.map((productId) => {
      const price =
        prices.find((x) => x.productId === productId && x.supplierId === supplierId) ?? prices.find((x) => x.productId === productId)!
      const p = PRODUCTS.find((x) => x.id === productId)!
      const usage = (DAILY_RATE[productId] ?? (productId === 'bread' ? 3 : 1)) * 4
      const packs = Math.max(1, Math.round((usage * (0.8 + rnd() * 0.5)) / p.packSize))
      return { productId, qty: round2(packs * p.packSize), unitPrice: price.unitPrice }
    })
    const at = startOfToday - d * DAY + 8 * 3_600_000
    const status = d === 2 ? 'in_transit' : i === 13 ? 'cancelled' : 'delivered'
    purchases.push({
      id: `PO-${po++}`,
      at,
      supplierId,
      payment: (['EFT', 'Cash', 'Card'] as const)[i % 3],
      status,
      lines,
      receivedAt: status === 'delivered' ? at + 5 * 3_600_000 : undefined,
    })
  }

  return {
    version: 1,
    products: PRODUCTS.map((p) => ({ ...p })),
    suppliers: SUPPLIERS.map((s) => ({ ...s })),
    prices,
    sales,
    purchases: purchases.reverse(),
    preferred: {},
    budget: 2500,
    profile: { ownerName: 'Saii', storeName: "Saii's Spaza", role: 'Owner', memberSince: new Date(2024, 2, 1).getTime() },
    queue: [],
    lastSyncedAt: now - 2 * 60_000,
  }
}
