import { useState } from 'react'
import Dashboard from './screens/Dashboard'
import Sales from './screens/Sales'
import Supply from './screens/Supply'
import Restock from './screens/Restock'

export type Tab = 'dashboard' | 'sales' | 'supply' | 'restock'

function AppHeader({ tab }: { tab: Tab }) {
  const labels: Record<Tab, string> = {
    dashboard: 'Dashboard',
    sales: 'Sales',
    supply: 'Supply',
    restock: 'Restock',
  }
  return (
    <header className="fixed top-0 w-full z-50 pt-safe bg-bg-surface/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] lg:hidden">
      <div className="h-16 px-space-md flex items-center justify-between gap-space-xs">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-bold text-label-bold text-text-primary truncate">Saii's Spaza</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-tint font-caption-medium text-caption-medium text-secondary">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              <span>Synced</span>
            </span>
          </div>
          <span className="font-caption text-caption text-text-secondary truncate">{labels[tab]}</span>
        </div>
        <div className="flex items-center gap-space-xs shrink-0">
          <button
           
          >
            
          </button>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function BottomNav({ tab, onTabChange }: { tab: Tab; onTabChange: (t: Tab) => void }) {
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'sales', icon: 'point_of_sale', label: 'Sales' },
    { key: 'supply', icon: 'storefront', label: 'Supply' },
    { key: 'restock', icon: 'inventory_2', label: 'Restock' },
  ]
  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe bg-bg-surface/90 backdrop-blur-xl shadow-[0_-2px_8px_rgba(45,55,72,0.08)] lg:hidden">
      <div className="flex items-center justify-around h-16 px-space-xs">
        {items.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`flex flex-col items-center justify-center min-w-[64px] h-12 px-space-xs py-1 rounded-lg transition-colors ${
              tab === key
                ? 'bg-accent-tint text-primary font-bold'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
            <span className="font-caption-medium text-caption-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const items: { key: Tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
    { key: 'sales', icon: 'point_of_sale', label: 'Sales' },
    { key: 'supply', icon: 'storefront', label: 'Supply' },
    { key: 'restock', icon: 'inventory_2', label: 'Restock' },
  ]

  return (
    <div className="bg-bg-base font-body text-body text-text-primary flex flex-col min-h-screen">
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-default flex-col p-space-lg">
        <div className="flex items-center gap-space-sm pb-space-xl">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined">inventory_2</span>
          </div>
          <div>
            <div className="font-h2 text-h2 text-text-primary">Sisonke Stock</div>
            <div className="font-caption text-caption text-text-secondary">Stock made simple</div>
          </div>
        </div>
        <nav className="flex flex-col gap-space-xs" aria-label="Main navigation">
          {items.map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`h-12 px-space-sm rounded-lg flex items-center gap-space-sm text-left transition-colors ${
                tab === key
                  ? 'bg-accent-tint text-primary font-label-bold'
                  : 'text-text-secondary hover:bg-surface-container-low hover:text-text-primary'
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <button>
          
          
        </button>
        <div className="mt-auto border-t border-border-default pt-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[20px]">person</span>
            </div>
            <div className="min-w-0">
              <div className="font-label-bold text-label-bold text-text-primary truncate">Saii's Spaza</div>
              <div className="font-caption text-caption text-secondary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Synced just now
              </div>
            </div>
          </div>
        </div>
      </aside>
      <AppHeader tab={tab} />
      {tab === 'dashboard' && <Dashboard />}
      {tab === 'sales' && <Sales />}
      {tab === 'supply' && <Supply />}
      {tab === 'restock' && <Restock />}
      <BottomNav tab={tab} onTabChange={setTab} />
    </div>
  )
}
