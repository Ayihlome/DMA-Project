// Sample data until the screen reads from Supabase

export interface SupplierOption {
  name: string
  unitPrice: number
}

export interface RestockItem {
  id: number
  name: string
  qty: number
  unit: string
  packs: string
  level: 'out-soon' | 'low'
  suppliers: SupplierOption[] // cheapest first
  why: string
}

export const ITEMS: RestockItem[] = [
  {
    id: 1,
    name: 'White bread 700g',
    qty: 20,
    unit: 'loaves',
    packs: '2 crates',
    level: 'out-soon',
    suppliers: [
      { name: 'Jumbo Cash & Carry', unitPrice: 13.2 },
      { name: 'Devland Wholesale', unitPrice: 13.9 },
    ],
    why: 'Only 2 loaves left and you sell about 15 a day, so you will run out in about 2 hours.',
  },
  {
    id: 2,
    name: 'Full cream milk 1L',
    qty: 20,
    unit: 'sachets',
    packs: '1 crate',
    level: 'out-soon',
    suppliers: [
      { name: 'Devland Wholesale', unitPrice: 12.5 },
      { name: 'Jumbo Cash & Carry', unitPrice: 12.95 },
    ],
    why: 'Only 3 sachets left in the fridge. Milk sells fastest in the morning.',
  },
  {
    id: 3,
    name: 'Sunflower oil 750ml',
    qty: 12,
    unit: 'bottles',
    packs: '1 box',
    level: 'low',
    suppliers: [
      { name: 'Jumbo Cash & Carry', unitPrice: 24.5 },
      { name: 'Devland Wholesale', unitPrice: 25.8 },
    ],
    why: '4 bottles left, enough for about a day and a half. You need it for frying kota chips.',
  },
]

// Stock bought every week regardless (cold drinks, airtime, cigarettes)
export const REGULAR_STOCK = 1032
