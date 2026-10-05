import { useState } from 'react'

interface RestockItem {
  id: number
  name: string
  desc: string
  cost: number
  badge: string
  badgeClass: string
  badgeIcon: string
  supplier: string
  supplierPrice: string
  suppliers: { name: string; price: string; priceDiff?: string }[]
  rationale: { icon: string; urgent: string; body: string }
}

const ITEMS: RestockItem[] = [
  {
    id: 1,
    name: 'White Bread 700g',
    desc: '20 loaves (2 crates) recommended',
    cost: 264.00,
    badge: 'CRITICAL',
    badgeClass: 'bg-error-default text-on-error',
    badgeIcon: 'warning',
    supplier: 'Jumbo Cash & Carry',
    supplierPrice: 'R13.20/ea',
    suppliers: [
      { name: 'Jumbo Cash & Carry', price: 'R13.20/ea' },
      { name: 'Devland Wholesale', price: 'R13.90/ea', priceDiff: '+R14.00' },
    ],
    rationale: {
      icon: 'save_as',
      urgent: '2 loaves left (~2h of stock before stockout)',
      body: 'Projected daily turnover: 15 loaves. Jumbo is currently R0.70 cheaper per unit than Devland. Fits well within your 10% daily emergency buffer.',
    },
  },
  {
    id: 2,
    name: 'Fresh Milk 1L Sachet',
    desc: '20 sachets (1 crate) recommended',
    cost: 250.00,
    badge: 'CRITICAL',
    badgeClass: 'bg-error-default text-on-error',
    badgeIcon: 'warning',
    supplier: 'Devland Wholesale',
    supplierPrice: 'R12.50/ea',
    suppliers: [
      { name: 'Devland Wholesale', price: 'R12.50/ea' },
      { name: 'Jumbo Cash & Carry', price: 'R12.95/ea', priceDiff: '+R9.00' },
    ],
    rationale: {
      icon: 'local_fire_department',
      urgent: 'High morning velocity item',
      body: 'Only 3 sachets remaining in fridge. Devland offers lowest carton rate this week with guaranteed same-day delivery tier.',
    },
  },
  {
    id: 3,
    name: 'Sunflower Cooking Oil 750ml',
    desc: '12 bottles (1 box case) recommended',
    cost: 294.00,
    badge: 'LOW STOCK',
    badgeClass: 'bg-[#DD6B20] text-on-primary',
    badgeIcon: 'flag',
    supplier: 'Jumbo Cash & Carry',
    supplierPrice: 'R24.50/ea',
    suppliers: [
      { name: 'Jumbo Cash & Carry', price: 'R24.50/ea' },
      { name: 'Devland Wholesale', price: 'R25.80/ea', priceDiff: '+R15.60' },
    ],
    rationale: {
      icon: 'inventory',
      urgent: 'Kota fryer requirement',
      body: 'Crucial fast-mover for fast-food operations. 4 bottles remaining on shelf (~1.5 days run rate).',
    },
  },
]

const BASE_OVERHEAD = 1032.00

export default function Restock() {
  const [budget, setBudget] = useState(2500)
  const [checked, setChecked] = useState<Set<number>>(new Set([1, 2, 3]))
  const [openAccordion, setOpenAccordion] = useState<Set<number>>(new Set([1]))
  const [openSupplier, setOpenSupplier] = useState<Set<number>>(new Set())
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'done'>('idle')

  const selectedCost = ITEMS.filter(i => checked.has(i.id)).reduce((s, i) => s + i.cost, 0)
  const totalCost = BASE_OVERHEAD + selectedCost
  const diff = budget - totalCost
  const pct = budget > 0 ? Math.min(100, (totalCost / budget) * 100) : 100
  const selectedCount = checked.size + 1

  function toggleCheck(id: number) {
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAccordion(id: number) {
    setOpenAccordion(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSupplier(id: number) {
    setOpenSupplier(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function submitOrder() {
    if (diff < 0) return
    setOrderState('loading')
    setTimeout(() => setOrderState('done'), 900)
  }

  return (
    <main className="flex flex-col relative w-full pt-16 pb-20 bg-bg-base lg:pl-64 lg:pt-0 lg:pb-0">
      <div className="flex flex-col w-full pb-28 lg:max-w-5xl lg:mx-auto lg:px-space-xl lg:pt-space-lg">

        {/* Top banner */}
        <div className="px-space-md pt-space-xs pb-space-sm">
          <div className="flex items-center">
            <div className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[20px]">psychology_alt</span>
              <span className="font-label-bold text-label-bold text-text-primary">Optimized Restock Plan</span>
            </div>
          </div>
          <p className="font-caption text-caption text-text-secondary mt-1">
            Prioritized by sales run-out risk and best wholesale unit price.
          </p>
        </div>

        {/* Budget Meter */}
        <div className="px-space-md mb-space-md">
          <div className="bg-bg-surface rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-caption text-caption text-text-secondary">Available Restock Budget</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-display text-display text-text-primary">R</span>
                  <input
                    aria-label="Restock budget"
                    className="font-display text-display text-text-primary w-32 bg-transparent focus:outline-none focus:bg-accent-tint/30 rounded px-1 -ml-1 transition-colors"
                    step={50}
                    type="number"
                    value={budget}
                    onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                  />
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">edit</span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-caption text-caption text-text-secondary">Allocated</span>
                <div className="font-label-bold text-label-bold text-text-primary mt-0.5">R{totalCost.toFixed(2)}</div>
                <span className="font-caption-medium text-caption-medium text-text-secondary">({pct.toFixed(0)}% used)</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${diff >= 0 ? 'bg-secondary' : 'bg-error-default'}`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-caption-medium text-caption-medium ${diff >= 0 ? 'bg-success-tint text-secondary' : 'bg-error-tint text-error-default'}`}>
                <span className="material-symbols-outlined text-[16px]">{diff >= 0 ? 'check_circle' : 'warning'}</span>
                <span>{diff >= 0 ? `R${diff.toFixed(2)} remaining buffer` : `R${Math.abs(diff).toFixed(2)} over budget`}</span>
              </div>
              <button
                onClick={() => setBudget(b => b + 500)}
                className="font-caption-medium text-caption-medium text-primary hover:underline flex items-center gap-0.5"
              >
                +R500 buffer
              </button>
            </div>

            {diff < 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-tint text-error-default font-caption-medium text-caption-medium">
                <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
                <span>Budget exceeded. Remove items or raise budget to enable ordering.</span>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Items */}
        <div className="px-space-md flex flex-col gap-space-xs">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="font-label-bold text-label-bold text-text-primary">Recommended Items ({ITEMS.length})</span>
            <span className="font-caption text-caption text-text-secondary">Sorted by stockout urgency</span>
          </div>

          {ITEMS.map(item => (
            <div key={item.id} className="bg-bg-surface rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
              <div className="flex items-start gap-space-sm">
                <label className="relative flex items-center justify-center pt-1 cursor-pointer">
                  <input
                    checked={checked.has(item.id)}
                    onChange={() => toggleCheck(item.id)}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                    type="checkbox"
                  />
                </label>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-bold text-caption-medium ${item.badgeClass}`}>
                      <span className="material-symbols-outlined text-[14px]">{item.badgeIcon}</span> {item.badge}
                    </span>
                    <span className="font-label-bold text-label-bold text-text-primary">R{item.cost.toFixed(2)}</span>
                  </div>
                  <h3 className="font-h2 text-h2 text-text-primary mt-1">{item.name}</h3>
                  <p className="font-caption text-caption text-text-secondary">{item.desc}</p>

                  {/* Supplier row */}
                  <div className="flex items-center justify-between mt-2 pt-2 bg-bg-base rounded-lg p-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="material-symbols-outlined text-secondary text-[16px] shrink-0">storefront</span>
                      <div className="truncate">
                        <span className="font-caption-medium text-caption-medium text-text-primary">{item.supplier}</span>
                        <span className="font-caption text-caption text-text-secondary"> · {item.supplierPrice}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSupplier(item.id)}
                      className="shrink-0 font-caption-medium text-caption-medium text-primary hover:underline px-1 py-0.5"
                    >
                      {openSupplier.has(item.id) ? 'Done' : 'Change'}
                    </button>
                  </div>

                  {/* Supplier switcher */}
                  {openSupplier.has(item.id) && (
                    <div className="flex flex-col gap-1.5 mt-2 p-2 bg-surface-container-low rounded-lg">
                      <span className="font-caption-medium text-caption-medium text-text-secondary">Compare Wholesalers:</span>
                      {item.suppliers.map((s, idx) => (
                        <label key={s.name} className="flex items-center justify-between p-2 rounded bg-bg-surface cursor-pointer">
                          <div className="flex items-center gap-2">
                            <input defaultChecked={idx === 0} name={`supplier-${item.id}`} type="radio" className="accent-primary" />
                            <span className={`font-caption-medium text-caption-medium text-text-primary ${idx > 0 ? 'opacity-80' : ''}`}>{s.name}</span>
                          </div>
                          <span className={idx === 0 ? 'font-label-bold text-label-bold text-secondary' : 'font-caption text-caption text-text-secondary'}>
                            {s.price}{s.priceDiff ? ` (${s.priceDiff})` : ''}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Accordion rationale */}
                  <div className="mt-2.5">
                    <button
                      onClick={() => toggleAccordion(item.id)}
                      className="w-full flex items-center justify-between font-caption-medium text-caption-medium text-primary hover:text-accent-pressed py-1"
                      type="button"
                    >
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">info</span>
                        <span>Why this item?</span>
                      </span>
                      <span className={`material-symbols-outlined text-[18px] transition-transform ${openAccordion.has(item.id) ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                    {openAccordion.has(item.id) && (
                      <div className="pt-1 text-text-secondary font-caption text-caption leading-relaxed">
                        <div className="p-2.5 rounded-lg bg-surface-container-low flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-error-default font-caption-medium">
                            <span className="material-symbols-outlined text-[14px]">{item.rationale.icon}</span>
                            <span>{item.rationale.urgent}</span>
                          </div>
                          <p>{item.rationale.body}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add custom item */}
          <button className="w-full h-14 rounded-xl border-2 border-dashed border-border-disabled bg-bg-base flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary transition-colors my-2" type="button">
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            <span className="font-label-bold text-label-bold">Add another custom item</span>
          </button>
        </div>

        {/* Sticky footer */}
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-bg-surface px-space-md py-3 shadow-[0_-2px_8px_rgba(45,55,72,0.12)] lg:bottom-0 lg:left-64">
          <div className="max-w-md lg:max-w-4xl mx-auto flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="font-caption-medium text-caption-medium text-text-primary">{selectedCount} items selected</span>
                <span className="text-text-secondary">·</span>
                <span className="font-label-bold text-label-bold text-text-primary">R{totalCost.toFixed(2)}</span>
              </div>
              <div className={`inline-flex items-center gap-1 font-caption-medium text-caption-medium ${diff >= 0 ? 'text-secondary' : 'text-error-default'}`}>
                <span className="material-symbols-outlined text-[14px]">{diff >= 0 ? 'verified' : 'error'}</span>
                <span>{diff >= 0 ? 'Within budget' : 'Exceeds limit'}</span>
              </div>
            </div>
            <button
              onClick={submitOrder}
              disabled={diff < 0 || orderState === 'done'}
              className={`w-full h-12 rounded-lg font-label-bold text-label-bold flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer ${
                diff < 0
                  ? 'bg-border-disabled text-on-surface-variant cursor-not-allowed opacity-60'
                  : orderState === 'done'
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-primary hover:bg-accent-pressed active:bg-accent-pressed text-on-primary'
              }`}
              type="button"
            >
              {orderState === 'loading' && (
                <>
                  <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
                  <span>Routing to Jumbo & Devland...</span>
                </>
              )}
              {orderState === 'done' && (
                <>
                  <span className="material-symbols-outlined text-[20px]">task_alt</span>
                  <span>Orders Sent via WhatsApp!</span>
                </>
              )}
              {orderState === 'idle' && (
                <>
                  <span className="material-symbols-outlined text-[20px]">{diff < 0 ? 'block' : 'shopping_bag'}</span>
                  <span>{diff < 0 ? 'Budget Exceeded' : 'Create Restock Order'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
