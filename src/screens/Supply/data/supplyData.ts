// Sample data until the screen reads from Supabase

export interface Supplier {
  id: string
  name: string
  unitPrice: number // per loaf
  updated: string
  distance: string
  minOrder: string
  note?: string
}

export const ITEM = {
  name: 'Albany white bread 700g',
  pack: 'Crate of 10 loaves',
  unitsPerPack: 10,
  priceMonthAgo: 13.8,
}

export const SUPPLIERS: Supplier[] = [
  { id: 'jumbo', name: 'Jumbo Cash & Carry', unitPrice: 13.2, updated: '2 days ago', distance: '4.2 km', minOrder: '2 crates' },
  { id: 'devland', name: 'Devland Wholesale', unitPrice: 13.9, updated: 'yesterday', distance: '3.8 km', minOrder: '1 crate' },
  {
    id: 'tiger', name: 'Tiger Brands Depot', unitPrice: 14.5, updated: '3 days ago', distance: '9.1 km', minOrder: '5 crates',
    note: 'Delivery fee under 5 crates',
  },
]
