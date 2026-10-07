import { colors } from '../../../theme/theme'

export type SupplierID = 'jumbo' | 'devland' | 'tiger'

export interface Supplier {
  id: SupplierID
  name: string
  price: number
  packPrice: number
  badge: string
  badgeBg: string
  badgeTextColor: string
  timestamp: string
  location?: string
  delivery?: string
  minOrder: string
  priceDelta?: string
  distance?: string
  warning?: string
}

export const SUPPLIERS: Supplier[] = [
  {
    id: 'jumbo',
    name: 'Jumbo Cash & Carry',
    price: 13.20, packPrice: 132.00,
    badge: 'CHEAPEST', badgeBg: '#2F855A', badgeTextColor: '#FFFFFF',
    timestamp: '2 days ago',
    location: 'Crown Mines (4.2 km)', delivery: 'Pickup ready',
    minOrder: 'Min: 2 crates (20 loaves)',
  },
  {
    id: 'devland',
    name: 'Devland Mega Wholesale',
    price: 13.90, packPrice: 139.00,
    badge: 'Standard Rate', badgeBg: colors.surfaceContainer, badgeTextColor: colors.textSecondary,
    timestamp: 'Yesterday',
    minOrder: 'Min: 1 crate',
    priceDelta: '+R0.70 more per loaf than cheapest', distance: '3.8 km away',
  },
  {
    id: 'tiger',
    name: 'Tiger Brands Direct Depot',
    price: 14.50, packPrice: 145.00,
    badge: 'Depot Direct', badgeBg: colors.surfaceContainer, badgeTextColor: colors.textSecondary,
    timestamp: '3 days ago',
    minOrder: 'Min: 5 crates',
    priceDelta: '+R1.30 more per loaf than cheapest',
    warning: 'Bulk delivery fee applies if under 5 crates',
  },
]

