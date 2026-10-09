import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../data/store'
import { available, coverLabel, daysCover, dashboardKpis, healthOf, needsAction, unitQty, type Health } from '../data/inventory'
import { categoryLabel, type Product } from '../data/types'
import { rand } from '../lib/format'
import { EmptyState, Icon, ProductThumb, StatTile, StatusBadge, TabPanel, Tabs, ToggleGroup, cx } from '../components/ui'

type View = 'action' | 'all'
type Sort = 'urgent' | 'name'

const HEALTH_RANK: Record<Health, number> = { setup: 0, out: 1, critical: 2, low: 3, healthy: 4 }
const QTY_TONE: Record<Health, string> = {
  setup: 'text-error-default',
  out: 'text-error-default',
  critical: 'text-error-default',
  low: 'text-tertiary',
  healthy: 'text-text-secondary',
}

function restockLabel(days: number) {
  if (!Number.isFinite(days)) return 'Not needed'
  if (days < 1) return 'Today'
  if (days < 2) return 'Tomorrow'
  return `In ${Math.floor(days)} days`
}

function InventoryRow({ product, urgent }: { product: Product; urgent: boolean }) {
  const { state } = useStore()
  const health = healthOf(state, product)
  const left = available(state, product)
  return (
    <li className="bg-bg-surface rounded-xl p-space-md shadow-sm flex items-center gap-space-sm">
      <ProductThumb product={product} grayscale={health === 'setup'} />
      <div className="flex flex-col gap-space-2xs min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-space-xs gap-y-space-2xs">
          <span className="font-label-bold text-label-bold text-text-primary truncate">{product.name}</span>
          {(needsAction(health) || !urgent) && <StatusBadge health={health} solid={urgent} />}
        </div>
        <span className="font-caption text-caption text-text-secondary truncate">
          {categoryLabel(product.category)} · {product.detail}
        </span>
        <span className={cx('font-caption-medium text-caption-medium', QTY_TONE[health])}>
          {health === 'setup'
            ? 'Add its recipe to start selling'
            : `${product.composite ? `${left} can be made` : `${unitQty(product, left)} left`} · ${coverLabel(state, product)}`}
        </span>
      </div>
      {!product.composite && needsAction(health) && (
        <Link
          to={`/supply?item=${product.id}`}
          className="shrink-0 min-h-tap min-w-tap sm:px-space-sm rounded-lg bg-surface-container text-primary font-label-bold text-caption-medium flex items-center justify-center gap-space-2xs hover:bg-accent-tint"
          aria-label={`Compare prices for ${product.name}`}
        >
          <Icon name="compare_arrows" />
          <span className="hidden sm:inline">Compare</span>
        </Link>
      )}
    </li>
  )
}

export default function Dashboard() {
  const { state } = useStore()
  const [view, setView] = useState<View>('action')
  const [sort, setSort] = useState<Sort>('urgent')
  const k = dashboardKpis(state)

  const rows = useMemo(() => {
    const base = view === 'action' ? state.products.filter((p) => needsAction(healthOf(state, p))) : state.products
    return [...base].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : HEALTH_RANK[healthOf(state, a)] - HEALTH_RANK[healthOf(state, b)] || daysCover(state, a) - daysCover(state, b),
    )
  }, [state, view, sort])

  const actionCount = state.products.filter((p) => needsAction(healthOf(state, p))).length
  const urgentCount = state.products.filter((p) => ['setup', 'out', 'critical'].includes(healthOf(state, p))).length
  const trend = k.salesYesterday > 0 ? Math.round(((k.salesToday - k.salesYesterday) / k.salesYesterday) * 100) : null
  const soonestItem = state.products.filter((p) => !p.composite).sort((a, b) => daysCover(state, a) - daysCover(state, b))[0]

  return (
    <div className="w-full lg:max-w-6xl lg:mx-auto lg:px-space-xl lg:py-space-lg pb-24 lg:pb-28">
      {/* Greeting */}
      <div className="px-space-md pt-space-md pb-space-sm lg:px-0 flex items-center justify-between gap-space-md">
        <div className="flex flex-col min-w-0">
          <h1 className="font-h1 text-h1 text-text-primary tracking-tight flex items-center gap-space-xs">
            Sawubona, {state.profile.ownerName}
            <Icon name="waving_hand" filled className="text-brand-purple" />
          </h1>
          <p className="font-body text-body text-text-secondary truncate">Ready for trade at {state.profile.storeName}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="overflow-x-auto no-scrollbar px-space-md lg:px-0 py-space-2xs">
        <div className="flex gap-space-sm w-max lg:w-full lg:grid lg:grid-cols-4">
          <StatTile
            className="w-40 lg:w-auto h-28"
            label="Sales today"
            icon="payments"
            value={rand(k.salesToday, { whole: true })}
            sub={
              trend === null ? (
                `${k.salesCount} sales`
              ) : (
                <span className={cx('inline-flex items-center gap-0.5', trend >= 0 ? 'text-secondary' : 'text-error-default')}>
                  <Icon name={trend >= 0 ? 'trending_up' : 'trending_down'} size="xs" />
                  {trend >= 0 ? '+' : ''}
                  {trend}% vs yesterday
                </span>
              )
            }
          />
          <StatTile
            className="w-40 lg:w-auto h-28"
            label="Need attention"
            icon="notification_important"
            iconTone="bg-error-tint text-error-default"
            tone={actionCount ? 'text-error-default' : 'text-secondary'}
            value={actionCount ? `${actionCount} items` : 'None'}
            sub={urgentCount ? `${urgentCount} critical or blocked` : 'All stock healthy'}
          />
          <StatTile
            className="w-40 lg:w-auto h-28"
            label="Stock value"
            icon="warehouse"
            iconTone="bg-brand-purple-tint text-brand-purple"
            value={rand(k.stockValue, { whole: true })}
            sub={`${k.itemCount} stock items at cost`}
          />
          <StatTile
            className="w-40 lg:w-auto h-28"
            label="Next restock"
            icon="local_shipping"
            iconTone="bg-brand-green-tint text-brand-green"
            value={restockLabel(k.soonest)}
            sub={soonestItem && Number.isFinite(k.soonest) ? `${soonestItem.name} runs out first` : undefined}
          />
        </div>
      </div>

      {/* View + sort */}
      <div className="px-space-md lg:px-0 pt-space-lg pb-space-sm flex flex-wrap items-center justify-between gap-space-sm">
        <Tabs
          idBase="dash"
          label="Inventory view"
          value={view}
          onChange={setView}
          className="w-full sm:w-auto sm:min-w-80"
          items={[
            { key: 'action', label: 'Action needed', count: actionCount },
            { key: 'all', label: 'All inventory', count: state.products.length },
          ]}
        />
        <ToggleGroup
          label="Sort inventory"
          value={sort}
          onChange={setSort}
          items={[
            { key: 'urgent', label: 'Most urgent' },
            { key: 'name', label: 'A–Z' },
          ]}
        />
      </div>

      <TabPanel idBase="dash" active={view} className="px-space-md lg:px-0">
        {rows.length === 0 ? (
          <div className="bg-bg-surface rounded-xl shadow-sm">
            <EmptyState icon="verified" title="Everything is well stocked" body="No items are expected to run out in the next few days." />
          </div>
        ) : (
          <ul className="flex flex-col gap-space-sm lg:grid lg:grid-cols-2">
            {rows.map((p) => (
              <InventoryRow key={p.id} product={p} urgent={view === 'action'} />
            ))}
          </ul>
        )}
        {view === 'action' && rows.length > 0 && (
          <p className="mt-space-sm p-space-md rounded-xl bg-accent-tint/70 font-caption text-caption text-primary flex items-center gap-space-sm">
            <Icon name="verified" />
            The other {state.products.length - rows.length} items are above their safe stock levels.
          </p>
        )}
      </TabPanel>

      {/* Record Sale FAB, bottom-right thumb zone (PRD 6.1) */}
      <Link
        to="/sales"
        className="fixed right-space-md bottom-fab lg:bottom-space-xl lg:right-space-xl z-40 min-h-tap px-space-lg rounded-xl bg-brand-gradient text-on-primary font-label-bold text-label-bold shadow-float flex items-center gap-space-xs hover:brightness-110 active:scale-95 transition"
      >
        <Icon name="add" />
        Record Sale
      </Link>
    </div>
  )
}
