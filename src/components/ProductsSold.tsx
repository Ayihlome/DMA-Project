import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../data/store'
import { DAY, available, coverLabel, daysCover, healthOf, needsAction, startOfToday, unitQty } from '../data/inventory'
import { categoryLabel } from '../data/types'
import { rand } from '../lib/format'
import { EmptyState, Figure, Icon, ProductThumb, StatusBadge, ToggleGroup, cx } from './ui'

type Period = 'today' | 'week' | 'month'
type Sort = 'units' | 'revenue' | 'stock'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: '7 days' },
  { key: 'month', label: '30 days' },
]
const SORTS: { key: Sort; label: string }[] = [
  { key: 'units', label: 'Best selling' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'stock', label: 'Runs out first' },
]
const COLS = 'lg:grid-cols-[1fr_9rem_7rem_8rem_8rem_8rem]'

export default function ProductsSold({ query }: { query: string }) {
  const { state } = useStore()
  const [period, setPeriod] = useState<Period>('week')
  const [sort, setSort] = useState<Sort>('units')

  const rows = useMemo(() => {
    const now = Date.now()
    const since = period === 'today' ? startOfToday(now) : now - (period === 'week' ? 7 : 30) * DAY
    const sold = new Map<string, number>()
    for (const s of state.sales) if (s.at >= since) for (const l of s.lines) sold.set(l.productId, (sold.get(l.productId) ?? 0) + l.qty)
    const q = query.trim().toLowerCase()
    return state.products
      .filter((p) => p.sellable)
      .filter((p) => !q || `${p.name} ${categoryLabel(p.category)}`.toLowerCase().includes(q))
      .map((p) => ({
        p,
        units: sold.get(p.id) ?? 0,
        revenue: (sold.get(p.id) ?? 0) * p.price,
        cover: daysCover(state, p, now),
        health: healthOf(state, p, now),
      }))
      .sort((a, b) => (sort === 'units' ? b.units - a.units : sort === 'revenue' ? b.revenue - a.revenue : a.cover - b.cover))
  }, [state, period, sort, query])

  const units = rows.reduce((t, r) => t + r.units, 0)
  const revenue = rows.reduce((t, r) => t + r.revenue, 0)
  const best = [...rows].sort((a, b) => b.units - a.units)[0]
  const attention = rows.filter((r) => needsAction(r.health)).length
  const maxUnits = Math.max(...rows.map((r) => r.units), 1)
  const periodLabel = PERIODS.find((p) => p.key === period)!.label.toLowerCase()

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-xs lg:gap-space-md">
        <Figure label={`Revenue · ${periodLabel}`} value={rand(revenue)} />
        <Figure label="Units sold" value={units.toLocaleString()} />
        <Figure label="Best seller" value={best && best.units > 0 ? best.p.name : 'No sales yet'} tone="text-primary" />
        <Figure
          label="Need attention"
          value={`${attention} ${attention === 1 ? 'product' : 'products'}`}
          tone={attention ? 'text-error-default' : 'text-secondary'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <ToggleGroup label="Sales period" value={period} onChange={setPeriod} items={PERIODS} />
        <ToggleGroup label="Sort products" value={sort} onChange={setSort} items={SORTS} />
      </div>

      <div
        className={cx(
          'hidden lg:grid gap-space-sm px-space-sm font-caption-medium text-caption-medium text-text-secondary uppercase tracking-wide',
          COLS,
        )}
        aria-hidden="true"
      >
        <span>Product</span>
        <span>Sold</span>
        <span className="text-right">Revenue</span>
        <span className="text-right">In stock</span>
        <span className="text-right">Stock left</span>
        <span className="text-right">Status</span>
      </div>

      <ul className="flex flex-col gap-space-xs">
        {rows.map(({ p, units: sold, revenue: rev, health }) => {
          const left = available(state, p)
          return (
            <li
              key={p.id}
              className={cx(
                'rounded-lg border border-border-default p-space-sm grid grid-cols-[1fr_auto] items-center gap-x-space-sm gap-y-space-xs',
                COLS,
              )}
            >
              <div className="flex items-center gap-space-sm min-w-0">
                <ProductThumb product={p} size="sm" grayscale={health === 'setup'} />
                <div className="flex flex-col min-w-0">
                  <span className="font-label-bold text-label-bold text-text-primary truncate">{p.name}</span>
                  <span className="font-caption text-caption text-text-secondary truncate">
                    {categoryLabel(p.category)} · {rand(p.price)} each
                  </span>
                </div>
              </div>
              <span className="lg:order-last justify-self-end">
                <StatusBadge health={health} />
              </span>
              <div className="col-span-2 lg:col-span-1 flex flex-col gap-space-2xs">
                <span className="font-label text-label text-text-primary">
                  {sold} <span className="text-text-secondary">{sold === 1 ? p.unit : p.unitPlural}</span>
                </span>
                <div className="h-1.5 rounded-full bg-surface-container-low overflow-hidden">
                  <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${(sold / maxUnits) * 100}%` }} />
                </div>
              </div>
              <dl className="col-span-2 lg:col-span-3 grid grid-cols-3 gap-space-sm">
                <div className="flex flex-col lg:items-end">
                  <dt className="lg:sr-only font-caption text-caption text-text-secondary">Revenue</dt>
                  <dd className="font-label-bold text-label-bold text-text-primary">{rand(rev)}</dd>
                </div>
                <div className="flex flex-col lg:items-end">
                  <dt className="lg:sr-only font-caption text-caption text-text-secondary">In stock</dt>
                  <dd
                    className={cx(
                      'font-label text-label',
                      health === 'healthy' ? 'text-text-primary' : health === 'low' ? 'text-tertiary' : 'text-error-default',
                    )}
                  >
                    {health === 'setup' ? '—' : p.composite ? `${left} can be made` : unitQty(p, left)}
                  </dd>
                </div>
                <div className="flex flex-col lg:items-end">
                  <dt className="lg:sr-only font-caption text-caption text-text-secondary">Stock left</dt>
                  <dd className="font-label text-label text-text-secondary text-right">{coverLabel(state, p).replace('About ', '~')}</dd>
                </div>
              </dl>
            </li>
          )
        })}
      </ul>

      {rows.length === 0 && <EmptyState icon="inventory_2" title="No products found" body="Try a different search term." />}

      {attention > 0 && (
        <div className="rounded-lg bg-warning-tint p-space-sm flex flex-wrap items-center gap-space-sm">
          <Icon name="warning" className="text-tertiary" />
          <span className="flex-1 min-w-0 font-label text-label text-text-primary">
            {attention} {attention === 1 ? 'product needs' : 'products need'} attention at the current selling rate.
          </span>
          <Link
            to="/restock"
            className="min-h-tap lg:min-h-10 px-space-sm rounded-lg bg-primary text-on-primary font-label-bold text-label-bold inline-flex items-center gap-space-2xs hover:bg-accent-pressed"
          >
            <Icon name="inventory_2" /> Open restock plan
          </Link>
        </div>
      )}
    </div>
  )
}
