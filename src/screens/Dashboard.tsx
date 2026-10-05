import { useState } from 'react'

type DashTab = 'action' | 'all'

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<DashTab>('action')

  return (
    <main className="flex flex-col relative w-full pt-16 pb-20 bg-bg-base lg:pl-64 lg:pt-0 lg:pb-0">
      <div className="flex flex-col w-full lg:max-w-7xl lg:mx-auto lg:px-space-xl lg:py-space-lg">
        {/* Greeting */}
        <div className="px-space-md pt-space-xs pb-space-sm flex flex-col gap-space-2xs">
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex flex-col min-w-0">
              <h1 className="font-h1 text-h1 text-text-primary tracking-tight">Sawubona, Saii 👋</h1>
              <p className="font-body text-body text-text-secondary truncate">Ready for trade at Saii's Spaza</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 px-space-xs py-1 rounded-full bg-success-tint">
              <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />
              <span className="font-caption-medium text-caption-medium text-secondary">✓ Synced just now</span>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="w-full overflow-x-auto no-scrollbar py-space-2xs px-space-md">
          <div className="flex items-center gap-space-sm w-max pr-space-md lg:grid lg:grid-cols-4 lg:w-full lg:pr-0">
            <div className="bg-bg-surface rounded-xl p-space-md w-[148px] lg:w-auto shrink-0 shadow-sm flex flex-col justify-between h-[106px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-caption-medium text-caption-medium text-text-secondary">Sales Today</span>
                <span className="w-6 h-6 rounded-full bg-accent-tint flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[15px]">payments</span>
                </span>
              </div>
              <div>
                <span className="font-h1 text-h1 text-text-primary block tracking-tight">R1,420</span>
                <span className="font-caption text-caption text-secondary flex items-center gap-0.5 mt-0.5">
                  <span className="material-symbols-outlined text-[13px]">trending_up</span> +14% vs yday
                </span>
              </div>
            </div>
            <div className="bg-bg-surface rounded-xl p-space-md w-[148px] lg:w-auto shrink-0 shadow-sm flex flex-col justify-between h-[106px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-caption-medium text-caption-medium text-text-secondary">Low-Stock Items</span>
                <span className="w-6 h-6 rounded-full bg-error-tint flex items-center justify-center text-error-default">
                  <span className="material-symbols-outlined text-[15px]">notification_important</span>
                </span>
              </div>
              <div>
                <span className="font-h1 text-h1 text-error-default block tracking-tight">3 items</span>
                <span className="font-caption text-caption text-error-default">Action required</span>
              </div>
            </div>
            <div className="bg-bg-surface rounded-xl p-space-md w-[148px] lg:w-auto shrink-0 shadow-sm flex flex-col justify-between h-[106px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-caption-medium text-caption-medium text-text-secondary">Stock Value</span>
                <span className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[15px]">warehouse</span>
                </span>
              </div>
              <div>
                <span className="font-h1 text-h1 text-text-primary block tracking-tight">R8,950</span>
                <span className="font-caption text-caption text-text-secondary">112 line items</span>
              </div>
            </div>
            <div className="bg-bg-surface rounded-xl p-space-md w-[148px] lg:w-auto shrink-0 shadow-sm flex flex-col justify-between h-[106px] relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="font-caption-medium text-caption-medium text-text-secondary">Next Restock</span>
                <span className="w-6 h-6 rounded-full bg-warning-tint flex items-center justify-center text-tertiary">
                  <span className="material-symbols-outlined text-[15px]">local_shipping</span>
                </span>
              </div>
              <div>
                <span className="font-h1 text-h1 text-text-primary block tracking-tight">In 2 days</span>
                <span className="font-caption text-caption text-tertiary font-medium">Tuesday Morning</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-space-md pt-space-md pb-space-xs flex items-center justify-between gap-space-xs">
          <div className="bg-surface-container p-1 rounded-xl flex items-center gap-1 w-full max-w-[280px]">
            <button
              onClick={() => setActiveTab('action')}
              className={`flex-1 min-h-[40px] px-space-xs rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'action'
                  ? 'bg-bg-surface text-primary shadow-sm font-label-bold text-label-bold'
                  : 'text-text-secondary hover:text-text-primary font-label text-label'
              }`}
            >
              {activeTab === 'action' && <span className="w-2 h-2 rounded-full bg-error-default" />}
              <span>Action Needed (4)</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 min-h-[40px] px-space-xs rounded-lg flex items-center justify-center gap-1 transition-all ${
                activeTab === 'all'
                  ? 'bg-bg-surface text-primary shadow-sm font-label-bold text-label-bold'
                  : 'text-text-secondary hover:text-text-primary font-label text-label'
              }`}
            >
              <span>All Inventory</span>
            </button>
          </div>
          <button aria-label="Restock checklist" className="w-10 h-10 rounded-xl bg-bg-surface flex items-center justify-center text-text-secondary active:scale-95 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">sort</span>
          </button>
        </div>

        {/* Inventory List */}
        <div className="px-space-md py-space-xs flex flex-col gap-space-sm pb-24">
          {/* White Bread - CRITICAL */}
          <div className="bg-bg-surface rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm active:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-12 h-12 rounded-xl bg-error-tint flex items-center justify-center shrink-0">
                <img
                  className="w-10 h-10 object-cover rounded-lg"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBFHjYrrRUqKNjrARsfZGOAI1qkgdX2Ar13FROC5FB-KdaGxFOJq264rf-SZd00QR_9CWpvuZn9kAZqkYBxQesgJh1KBJ9Ss2mm9qoV6D5kcOCrIp9kl9Q9jYx3rW9n681V1uKtytLDNEZQ6V_A5Mys6LKJgNwWNRslzZjFGYfw72WnO0FlSP4DPE15uvevsnLDL4mGPjjWmTyFldFCMkYTmNnYzyDZRwVC7kqFajJHCYqWBy3duTqg"
                  alt="White bread"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-space-2xs">
                  <span className="font-label-bold text-label-bold text-text-primary truncate">White Bread</span>
                </div>
                <span className="font-caption text-caption text-text-secondary">Brown/White 700g</span>
                <span className="font-caption-medium text-caption-medium text-error-default mt-1">2 loaves left</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#C53030] text-bg-surface font-label-bold text-caption-medium tracking-wide">
                CRITICAL
              </span>
              <button className="min-h-[36px] px-3 rounded-lg bg-surface-container text-primary font-label-bold text-caption-medium flex items-center gap-1 active:bg-accent-tint">
                <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                <span>Order</span>
              </button>
            </div>
          </div>

          {/* Full Cream Milk - CRITICAL */}
          <div className="bg-bg-surface rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm active:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-12 h-12 rounded-xl bg-error-tint flex items-center justify-center shrink-0">
                <img
                  className="w-10 h-10 object-cover rounded-lg"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuDVGgWBhR-2eD2fsFZxgS7dYqHAAZTwhLvtyJo9nzEWlrakfsq3fG4FFebBCUXLzqewlkq2BR27N5GtgdYgzpC1DYKZW8cW1S0T3w52hF6tbfpQt081-auegh3vq54JZhweuKC58QcDXAE8gyymkYHQxOn9pb3IHDb3uham7Gbz48QhMp5vj0VATjkoVHbGjm3SxBnUQKDt8lQs_w_yHZlHnyfokrsg0Y1gJCCGlMK8rNZZYXpOFHPX"
                  alt="Full cream milk"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-bold text-label-bold text-text-primary truncate">Full Cream Milk 1L</span>
                <span className="font-caption text-caption text-text-secondary">Fresh Milk Sachets</span>
                <span className="font-caption-medium text-caption-medium text-error-default mt-1">4 sachets left</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2 py-1 rounded-md bg-[#C53030] text-bg-surface font-label-bold text-caption-medium tracking-wide">
                CRITICAL
              </span>
              <button className="min-h-[36px] px-3 rounded-lg bg-surface-container text-primary font-label-bold text-caption-medium flex items-center gap-1 active:bg-accent-tint">
                <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                <span>Order</span>
              </button>
            </div>
          </div>

          {/* Sunflower Cooking Oil - LOW */}
          <div className="bg-bg-surface rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm active:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-12 h-12 rounded-xl bg-warning-tint flex items-center justify-center shrink-0">
                <img
                  className="w-10 h-10 object-cover rounded-lg"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBu8IVfYgHJO2j73tm8Fqi1FqzRu-hj7S-30qp8Fji1ZwWy2LseqQ-1TWHgE-UYA-0IQUF87orQpGGVHbOIFYv4TgMvyIpRbbRH_XJWuExtHqFipyNFlt1av9KxcPPPHd4c5xTiVBgSfXpC4JOSeSqIE6GLeXJiEfsk3ugFubX9c7KH_drL90i9Rvr7S_0DLffx-fnRL3U9CqapM25kzPwuhwKyzsGMB7qrG6gHN5i38pOCHsZu1k7C"
                  alt="Sunflower cooking oil"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-bold text-label-bold text-text-primary truncate">Sunflower Cooking Oil</span>
                <span className="font-caption text-caption text-text-secondary">750ml Clear PET</span>
                <span className="font-caption-medium text-caption-medium text-tertiary mt-1">5 bottles left</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#DD6B20] text-bg-surface font-label-bold text-caption-medium tracking-wide">
                LOW
              </span>
              <button className="min-h-[36px] px-3 rounded-lg bg-surface-container text-primary font-label-bold text-caption-medium flex items-center gap-1 active:bg-accent-tint">
                <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                <span>Order</span>
              </button>
            </div>
          </div>

          {/* Maize Meal - LOW */}
          <div className="bg-bg-surface rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-sm active:bg-surface-container-low transition-colors">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-12 h-12 rounded-xl bg-warning-tint flex items-center justify-center shrink-0">
                <img
                  className="w-10 h-10 object-cover rounded-lg"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCRKdoP7hNUdHU9zIsuaX0-WThN93ze3Hiwx5yz5PmfqSm81iqoSv8dh7dVl1y-37JOkJNXtbHv8Ua1D6iG-4yltoynG7uUcQZTo65gmHYe9PmgM1bZlNEIht8aGD2DpDuaDTaZrrgDGu414yxHpIn-fx2iwXVhdkjhx0wlONgdGiuVo3XkV4Mp08rdx8yLHNsZS3p2dgS3_tgwXrwRbMxdbLYn51j-7IM8n4nImyC2xJFF5aEZ-tiO"
                  alt="Maize meal"
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-label-bold text-label-bold text-text-primary truncate">Maize Meal 2.5kg</span>
                <span className="font-caption text-caption text-text-secondary">Iwisa Super Maize</span>
                <span className="font-caption-medium text-caption-medium text-tertiary mt-1">6 bags left</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#DD6B20] text-bg-surface font-label-bold text-caption-medium tracking-wide">
                LOW
              </span>
              <button className="min-h-[36px] px-3 rounded-lg bg-surface-container text-primary font-label-bold text-caption-medium flex items-center gap-1 active:bg-accent-tint">
                <span className="material-symbols-outlined text-[14px]">add_shopping_cart</span>
                <span>Order</span>
              </button>
            </div>
          </div>

          {/* All-clear note */}
          <div className="bg-accent-tint/60 rounded-xl p-space-md flex items-center gap-space-sm mt-space-2xs">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-bg-surface shrink-0">
              <span className="material-symbols-outlined text-[18px]">verified</span>
            </div>
            <p className="font-caption text-caption text-primary flex-1">
              All other 108 staple items are well stocked above buffer safe-levels.
            </p>
          </div>
        </div>

        {/* Record Sale FAB */}
        <div className="fixed right-space-md bottom-20 z-40 lg:right-space-xl lg:bottom-space-xl">
          <button className="h-12 px-space-md rounded-xl bg-[#319795] text-on-primary font-label-bold text-label-bold shadow-[0_2px_8px_rgba(45,55,72,0.12)] flex items-center gap-2 active:bg-accent-pressed transition-transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">add</span>
            <span>Record Sale</span>
          </button>
        </div>
      </div>
    </main>
  )
}
