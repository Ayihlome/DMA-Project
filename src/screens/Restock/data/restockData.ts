import { colors } from '../../../theme/theme'

export interface RestockItem {
  id: number
  name: string
  desc: string
  cost: number
  badge: string
  badgeBg: string
  badgeIcon: string
  supplier: string
  supplierPrice: string
  suppliers: { name: string; price: string; diff?: string }[]
  rationale: { icon: string; urgent: string; body: string }
}

export const ITEMS: RestockItem[] = [
  {
    id: 1,
    name: 'White Bread 700g',
    desc: '20 loaves (2 crates) recommended',
    cost: 264,
    badge: 'CRITICAL', badgeBg: colors.errorDefault, badgeIcon: 'warning',
    supplier: 'Jumbo Cash & Carry', supplierPrice: 'R13.20/ea',
    suppliers: [
      { name: 'Jumbo Cash & Carry', price: 'R13.20/ea' },
      { name: 'Devland Wholesale', price: 'R13.90/ea', diff: '+R14.00' },
    ],
    rationale: {
      icon: 'save_as',
      urgent: '2 loaves left (~2h of stock before stockout)',
      body: 'Projected daily turnover: 15 loaves. Jumbo is currently R0.70 cheaper per unit than Devland. Fits within your 10% daily emergency buffer.',
    },
  },
  {
    id: 2,
    name: 'Fresh Milk 1L Sachet',
    desc: '20 sachets (1 crate) recommended',
    cost: 250,
    badge: 'CRITICAL', badgeBg: colors.errorDefault, badgeIcon: 'warning',
    supplier: 'Devland Wholesale', supplierPrice: 'R12.50/ea',
    suppliers: [
      { name: 'Devland Wholesale', price: 'R12.50/ea' },
      { name: 'Jumbo Cash & Carry', price: 'R12.95/ea', diff: '+R9.00' },
    ],
    rationale: {
      icon: 'local_fire_department',
      urgent: 'High morning velocity item',
      body: 'Only 3 sachets remaining in fridge. Devland offers lowest carton rate this week with guaranteed same-day delivery.',
    },
  },
  {
    id: 3,
    name: 'Sunflower Cooking Oil 750ml',
    desc: '12 bottles (1 box case) recommended',
    cost: 294,
    badge: 'LOW STOCK', badgeBg: '#DD6B20', badgeIcon: 'flag',
    supplier: 'Jumbo Cash & Carry', supplierPrice: 'R24.50/ea',
    suppliers: [
      { name: 'Jumbo Cash & Carry', price: 'R24.50/ea' },
      { name: 'Devland Wholesale', price: 'R25.80/ea', diff: '+R15.60' },
    ],
    rationale: {
      icon: 'inventory',
      urgent: 'Kota fryer requirement',
      body: 'Crucial fast-mover. 4 bottles remaining on shelf (~1.5 days run rate).',
    },
  },
]

export const BASE_OVERHEAD = 1032

