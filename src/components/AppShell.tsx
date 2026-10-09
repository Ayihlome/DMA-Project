import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { useStore } from '../data/store'
import { dashboardKpis } from '../data/inventory'
import { relativeTime } from '../lib/format'
import { BrandMark, Icon, Wordmark, cx } from './ui'

export const NAV = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/sales', icon: 'point_of_sale', label: 'Sales' },
  { to: '/supply', icon: 'storefront', label: 'Supply' },
  { to: '/restock', icon: 'inventory_2', label: 'Restock' },
] as const

const TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/sales': 'Record Sale',
  '/supply': 'Compare Prices',
  '/restock': 'Restock Plan',
  '/profile': 'Profile',
}

/** Re-renders periodically so relative times ("2 min ago") stay current. */
function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

/** PRD 6.1: always show offline / pending / saved status without blocking work. */
export function SyncStatus({ compact }: { compact?: boolean }) {
  useTick()
  const { online, pending, state } = useStore()
  const view = !online
    ? {
        icon: 'cloud_off',
        text: pending ? `Offline · ${pending} saved on device` : 'Offline · saved on device',
        short: 'Offline',
        tone: 'bg-warning-tint text-tertiary',
      }
    : pending
      ? {
          icon: 'sync',
          text: `Syncing ${pending} ${pending === 1 ? 'change' : 'changes'}`,
          short: 'Syncing',
          tone: 'bg-accent-tint text-primary',
          spin: true,
        }
      : { icon: 'cloud_done', text: `Synced ${relativeTime(state.lastSyncedAt)}`, short: 'Synced', tone: 'bg-success-tint text-secondary' }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-caption-medium text-caption-medium whitespace-nowrap',
        view.tone,
      )}
      title={view.text}
    >
      <Icon name={view.icon} size="xs" className={view.spin ? 'animate-spin' : undefined} />
      <span className={compact ? 'sr-only sm:not-sr-only' : undefined}>{compact ? view.short : view.text}</span>
      {compact && <span className="sr-only">{view.text}</span>}
    </span>
  )
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U'
  const dims = {
    sm: 'w-9 h-9 font-caption-medium text-caption-medium',
    md: 'w-10 h-10 font-label-bold text-label-bold',
    lg: 'w-24 h-24 rounded-2xl font-display text-display',
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        'bg-brand-gradient text-on-primary flex items-center justify-center shrink-0',
        size === 'lg' ? '' : 'rounded-full',
        dims[size],
      )}
    >
      {initials}
    </span>
  )
}
export { Avatar }

function Sidebar() {
  const { state } = useStore()
  const attention = dashboardKpis(state).attention.length
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-50 w-64 bg-bg-surface border-r border-border-default flex-col p-space-lg">
      <Link to="/" className="flex items-center gap-space-sm pb-space-xl rounded-lg" aria-label="StockEvo home">
        <BrandMark />
        <span className="flex flex-col">
          <Wordmark />
          <span className="font-caption text-caption text-text-secondary">Stock made simple</span>
        </span>
      </Link>
      <nav className="flex flex-col gap-space-2xs" aria-label="Main">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'h-12 px-space-sm rounded-lg flex items-center gap-space-sm transition-colors',
                isActive
                  ? 'bg-accent-tint text-primary font-label-bold text-label-bold'
                  : 'font-label text-label text-text-secondary hover:bg-surface-container-low hover:text-text-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={icon} filled={isActive} />
                <span className="flex-1">{label}</span>
                {to === '/restock' && attention > 0 && (
                  <span
                    className="min-w-6 h-6 px-1.5 rounded-full bg-error-default text-on-error font-caption-medium text-caption-medium flex items-center justify-center"
                    aria-label={`${attention} items need restocking`}
                  >
                    {attention}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-space-sm border-t border-border-default pt-space-md">
        <SyncStatus />
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            cx(
              '-mx-space-xs p-space-xs rounded-lg flex items-center gap-space-sm transition-colors',
              isActive ? 'bg-accent-tint' : 'hover:bg-surface-container-low',
            )
          }
        >
          <Avatar name={state.profile.ownerName} />
          <span className="min-w-0 flex-1 flex flex-col">
            <span className="font-label-bold text-label-bold text-text-primary truncate">{state.profile.storeName}</span>
            <span className="font-caption text-caption text-text-secondary truncate">{state.profile.ownerName} · View profile</span>
          </span>
          <Icon name="chevron_right" className="text-text-secondary" />
        </NavLink>
      </div>
    </aside>
  )
}

function MobileHeader() {
  const { state } = useStore()
  const { pathname, key } = useLocation()
  const navigate = useNavigate()
  const isSubPage = !NAV.some((n) => n.to === pathname)
  const goBack = () => (key !== 'default' && window.history.length > 1 ? navigate(-1) : navigate('/'))
  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-safe bg-bg-surface/90 backdrop-blur-xl shadow-bar-down lg:hidden">
      <div className="h-16 px-space-xs flex items-center gap-space-xs">
        {isSubPage ? (
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="w-tap h-tap rounded-lg flex items-center justify-center text-text-primary hover:bg-surface-container-low"
          >
            <Icon name="arrow_back" />
          </button>
        ) : (
          <span className="pl-space-xs">
            <BrandMark size="sm" />
          </span>
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="font-label-bold text-label-bold text-text-primary truncate">{state.profile.storeName}</span>
          <span className="font-caption text-caption text-text-secondary truncate">{TITLES[pathname] ?? 'StockEvo'}</span>
        </div>
        <SyncStatus compact />
        <Link
          to="/profile"
          aria-label="Open profile"
          className={cx('w-tap h-tap rounded-full flex items-center justify-center', pathname === '/profile' && 'ring-2 ring-primary')}
        >
          <Avatar name={state.profile.ownerName} size="sm" />
        </Link>
      </div>
    </header>
  )
}

function BottomNav() {
  return (
    <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-50 pb-safe bg-bg-surface/95 backdrop-blur-xl shadow-bar-up lg:hidden">
      <div className="h-16 flex items-stretch justify-around px-space-2xs">
        {NAV.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cx(
                'flex-1 min-w-tap flex flex-col items-center justify-center gap-0.5 rounded-lg my-space-2xs transition-colors',
                isActive ? 'bg-accent-tint text-primary font-label-bold' : 'text-text-secondary hover:text-text-primary',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={icon} filled={isActive} />
                <span className="font-caption-medium text-caption-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

export default function AppShell() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = `${TITLES[pathname] ?? 'Not found'} · StockEvo`
    window.scrollTo(0, 0)
  }, [pathname])
  return (
    <div className="min-h-dvh bg-bg-base font-body text-body text-text-primary">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-space-xs focus:left-space-xs focus:z-80 focus:px-space-md focus:py-space-xs focus:bg-bg-surface focus:rounded-lg focus:shadow-float"
      >
        Skip to content
      </a>
      <Sidebar />
      <MobileHeader />
      <main id="main" className="pt-app-header pb-app-nav lg:pt-0 lg:pb-0 lg:pl-64">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
