import { useState } from 'react'

type Supplier = 'jumbo' | 'devland' | 'tiger'

interface SupplierCard {
  id: Supplier
  name: string
  price: number
  packPrice: number
  badge: string
  badgeClass: string
  timestamp: string
  location: string
  distance: string
  delivery: string
  deliveryIcon: string
  minOrder: string
  priceDelta?: string
  warning?: string
}

const SUPPLIERS: SupplierCard[] = [
  {
    id: 'jumbo',
    name: 'Jumbo Cash & Carry',
    price: 13.20,
    packPrice: 132.00,
    badge: 'CHEAPEST',
    badgeClass: 'bg-[#2F855A] text-on-secondary',
    timestamp: '2 days ago',
    location: 'Crown Mines (4.2 km)',
    distance: '4.2 km',
    delivery: 'Pickup ready',
    deliveryIcon: 'local_shipping',
    minOrder: 'Min: 2 crates (20 loaves)',
  },
  {
    id: 'devland',
    name: 'Devland Mega Wholesale',
    price: 13.90,
    packPrice: 139.00,
    badge: 'Standard Rate',
    badgeClass: 'bg-surface-container text-text-secondary',
    timestamp: 'Yesterday',
    location: '',
    distance: '3.8 km away',
    delivery: '',
    deliveryIcon: '',
    minOrder: 'Min: 1 crate',
    priceDelta: '+R0.70 more per loaf than cheapest',
  },
  {
    id: 'tiger',
    name: 'Tiger Brands Direct Depot',
    price: 14.50,
    packPrice: 145.00,
    badge: 'Depot Direct',
    badgeClass: 'bg-surface-container text-text-secondary',
    timestamp: '3 days ago',
    location: '',
    distance: '',
    delivery: '',
    deliveryIcon: '',
    minOrder: 'Min: 5 crates',
    priceDelta: '+R1.30 more per loaf than cheapest',
    warning: 'Bulk delivery fee applies if under 5 crates',
  },
]

export default function Supply() {
  const [selected, setSelected] = useState<Supplier>('jumbo')
  const [modalOpen, setModalOpen] = useState(false)
  const [applied, setApplied] = useState(false)

  function applySupplier() {
    setApplied(true)
    setTimeout(() => setApplied(false), 1800)
  }

  const selectedCard = SUPPLIERS.find(s => s.id === selected)!

  return (
    <main className="flex flex-col relative w-full pt-16 pb-20 bg-bg-base lg:pl-64 lg:pt-0 lg:pb-0">
      <div className="flex flex-col w-full px-space-md py-space-sm space-y-space-md lg:max-w-6xl lg:mx-auto lg:px-space-xl lg:py-space-lg">

        {/* Item Selector */}
        <div className="flex flex-col bg-bg-surface rounded-xl p-space-md shadow-sm space-y-space-xs">
          <label className="font-caption-medium text-caption-medium text-text-secondary uppercase tracking-wider">Item for Comparison</label>
          <div className="flex items-center justify-between gap-space-xs p-space-xs bg-bg-base rounded-lg min-h-[48px] cursor-pointer">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-9 h-9 rounded-lg bg-accent-tint flex items-center justify-center shrink-0 text-primary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>bakery_dining</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-bold text-label-bold text-text-primary truncate">Albany White Bread 700g</span>
                <span className="font-caption text-caption text-text-secondary truncate">Standard Crate of 10 Loaves</span>
              </div>
            </div>
            <button aria-label="Change Item" className="w-10 h-10 flex items-center justify-center rounded-lg text-primary hover:bg-accent-tint shrink-0" type="button">
              <span className="material-symbols-outlined text-[22px]">swap_horiz</span>
            </button>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-space-xs pt-space-2xs">
            <div className="bg-surface-container-low rounded-lg p-space-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-secondary">trending_down</span>
              <div className="flex flex-col">
                <span className="font-caption text-caption text-text-secondary">Lowest Unit</span>
                <span className="font-label-bold text-label-bold text-text-primary">R13.20 <span className="font-caption text-caption text-text-secondary font-normal">/ loaf</span></span>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-space-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">savings</span>
              <div className="flex flex-col">
                <span className="font-caption text-caption text-text-secondary">Potential Save</span>
                <span className="font-label-bold text-label-bold text-secondary">R13.00 <span className="font-caption text-caption text-text-secondary font-normal">/ 10-pack</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-space-2xs pt-space-2xs">
          <div className="flex items-center gap-1.5">
            <span className="font-label-bold text-label-bold text-text-primary">Wholesale Quotations</span>
            <span className="px-1.5 py-0.5 rounded-full bg-surface-container text-text-secondary font-caption-medium text-caption-medium">3 available</span>
          </div>
          <span className="font-caption text-caption text-text-secondary">Sorted by unit price</span>
        </div>

        {/* Supplier Cards */}
        <div className="flex flex-col space-y-space-sm">
          {SUPPLIERS.map(s => {
            const isSelected = selected === s.id
            return (
              <div
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`relative bg-bg-surface rounded-xl p-space-md shadow-sm transition-all duration-200 cursor-pointer ${isSelected ? '' : 'opacity-90'}`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-space-xs mb-space-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded font-label-bold text-[11px] tracking-wide uppercase shadow-sm ${s.badgeClass}`}>
                      {s.id === 'jumbo' && <span className="material-symbols-outlined text-[14px]">verified</span>}
                      {s.badge}
                    </span>
                    <span className="font-caption text-caption text-text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">schedule</span> {s.timestamp}
                    </span>
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-transform ${isSelected ? 'bg-primary text-on-primary' : 'bg-surface-container text-transparent'}`}>
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  </div>
                </div>

                <div className="flex justify-between items-baseline min-w-0">
                  <h2 className="font-label-bold text-label-bold text-text-primary truncate">{s.name}</h2>
                  <div className="text-right shrink-0">
                    <div className="font-h1 text-h1 text-text-primary font-bold">R{s.price.toFixed(2)} <span className="font-caption text-caption text-text-secondary font-normal">/ loaf</span></div>
                  </div>
                </div>

                <div className="flex justify-between items-center mt-1 text-text-secondary font-caption text-caption">
                  <span>Pack of 10: <strong className="text-text-primary font-medium">R{s.packPrice.toFixed(2)}</strong></span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-low text-text-primary font-caption-medium">{s.minOrder}</span>
                </div>

                {s.id === 'jumbo' && (
                  <div className="flex items-center gap-3 mt-space-xs pt-space-xs text-text-secondary font-caption text-caption">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-primary">location_on</span> {s.location}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px] text-secondary">local_shipping</span> {s.delivery}
                    </span>
                  </div>
                )}

                {s.priceDelta && (
                  <div className="mt-space-xs pt-space-xs flex items-center justify-between">
                    <span className="font-caption text-caption text-text-secondary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">arrow_upward</span> {s.priceDelta}
                    </span>
                    {s.distance && <span className="font-caption text-caption text-text-secondary">{s.distance}</span>}
                  </div>
                )}

                {s.warning && (
                  <div className="mt-space-xs pt-space-xs">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-warning-tint text-tertiary">
                      <span className="material-symbols-outlined text-[18px] text-[#DD6B20] shrink-0">warning</span>
                      <span className="font-caption-medium text-caption-medium text-text-primary">{s.warning}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add supplier placeholder */}
          <div
            onClick={() => setModalOpen(true)}
            className="w-full min-h-[104px] p-space-md rounded-xl bg-transparent flex items-center justify-center text-center cursor-pointer transition-colors hover:bg-bg-surface/50 active:scale-[0.99]"
            style={{ border: '2px dashed #CBD5E0' }}
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary mb-1">
                <span className="material-symbols-outlined text-[24px]">add_circle</span>
              </div>
              <span className="font-label-bold text-label-bold text-text-primary">+ Add new supplier price</span>
              <span className="font-caption text-caption text-text-secondary">Log quote or invoice from local distributor</span>
            </div>
          </div>
        </div>

        {/* Price Trend Sparkline */}
        <div className="bg-bg-surface rounded-xl p-space-md shadow-sm space-y-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-label-bold text-label-bold text-text-primary">30-Day Price Trend (Albany 700g)</span>
            <span className="font-caption-medium text-caption-medium text-secondary flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[16px]">south_east</span> -4.3%
            </span>
          </div>
          <div className="w-full h-12 flex items-end">
            <svg className="w-full h-10 overflow-visible" fill="none" preserveAspectRatio="none" viewBox="0 0 300 40">
              <path d="M0,15 L40,18 L80,12 L120,22 L160,19 L200,28 L240,25 L300,35" stroke="#319795" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
              <path d="M0,15 L40,18 L80,12 L120,22 L160,19 L200,28 L240,25 L300,35 L300,40 L0,40 Z" fill="rgba(49,151,149,0.08)" />
              <circle cx="300" cy="35" fill="#2F855A" r="3.5" />
            </svg>
          </div>
          <div className="flex justify-between text-text-secondary font-caption text-caption pt-1">
            <span>1 Month Ago: R13.80</span>
            <span>Current Best: R13.20</span>
          </div>
        </div>

        {/* Apply Button */}
        <div className="pt-space-xs pb-space-sm">
          <button
            onClick={applySupplier}
            className={`w-full h-12 min-h-[48px] px-space-md rounded-lg text-on-primary font-label-bold text-label-bold flex items-center justify-center gap-2 shadow-sm transition-all duration-150 ${applied ? 'bg-secondary' : 'bg-primary hover:bg-accent-pressed active:bg-accent-pressed'}`}
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">{applied ? 'check' : 'check_circle'}</span>
            <span>{applied ? 'Saved to Restock List' : `Apply ${selectedCard.name} to Restock Plan`}</span>
          </button>
        </div>
      </div>

      {/* Add Price Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-space-md bg-on-background/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div className="w-full max-w-md bg-bg-surface rounded-2xl p-space-md shadow-xl flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-h2 text-h2 text-text-primary">Add Supplier Price</h3>
              <button onClick={() => setModalOpen(false)} aria-label="Close" className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary" type="button">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>
            <div className="flex flex-col space-y-1">
              <label className="font-caption-medium text-caption-medium text-text-secondary">Distributor / Supplier Name</label>
              <input className="h-12 px-space-sm rounded-lg bg-bg-base text-text-primary font-body text-body outline-none focus:bg-surface-container-lowest" placeholder="e.g. Cambridge Food / Local Depot" type="text" />
            </div>
            <div className="grid grid-cols-2 gap-space-xs">
              <div className="flex flex-col space-y-1">
                <label className="font-caption-medium text-caption-medium text-text-secondary">Pack Price (R)</label>
                <input className="h-12 px-space-sm rounded-lg bg-bg-base text-text-primary font-body text-body outline-none focus:bg-surface-container-lowest" placeholder="135.00" type="number" />
              </div>
              <div className="flex flex-col space-y-1">
                <label className="font-caption-medium text-caption-medium text-text-secondary">Units Per Pack</label>
                <input className="h-12 px-space-sm rounded-lg bg-bg-base text-text-primary font-body text-body outline-none focus:bg-surface-container-lowest" type="number" defaultValue={10} />
              </div>
            </div>
            <div className="pt-space-xs">
              <button onClick={() => setModalOpen(false)} className="w-full h-12 min-h-[48px] rounded-lg bg-primary text-on-primary font-label-bold text-label-bold flex items-center justify-center" type="button">
                Save & Compare
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
