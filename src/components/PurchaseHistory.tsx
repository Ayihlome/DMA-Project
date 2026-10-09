import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { productById, purchaseTotal, supplierName, unitQty } from '../data/inventory'
import type { PurchaseStatus } from '../data/types'
import { rand, shortDate } from '../lib/format'
import { useToast } from './Toast'
import ProductsSold from './ProductsSold'
import { Button, Card, Chip, EmptyState, Figure, Icon, SearchField, TabPanel, Tabs, cx } from './ui'

type View = 'purchases' | 'sales'
type Filter = 'all' | PurchaseStatus

const STATUS: Record<PurchaseStatus, { label: string; icon: string; className: string }> = {
  planned: { label: 'Order list', icon: 'checklist', className: 'bg-brand-purple-tint text-brand-purple' },
  in_transit: { label: 'In transit', icon: 'local_shipping', className: 'bg-accent-tint text-primary' },
  delivered: { label: 'Received', icon: 'check_circle', className: 'bg-success-tint text-secondary' },
  cancelled: { label: 'Cancelled', icon: 'cancel', className: 'bg-error-tint text-error-default' },
}

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'planned', label: 'Order lists' },
  { key: 'in_transit', label: 'In transit' },
  { key: 'delivered', label: 'Received' },
  { key: 'cancelled', label: 'Cancelled' },
]

const PAGE = 6
const COLS = 'lg:grid-cols-[6rem_1fr_7rem_7rem_7rem_2rem]'

function StatusPill({ status }: { status: PurchaseStatus }) {
  const s = STATUS[status]
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-caption-medium text-caption-medium whitespace-nowrap',
        s.className,
      )}
    >
      <Icon name={s.icon} size="xs" />
      {s.label}
    </span>
  )
}

function Purchases({ query }: { query: string }) {
  const { state, receivePurchase, cancelPurchase } = useStore()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('all')
  const [open, setOpen] = useState<string | null>(null)
  const [visible, setVisible] = useState(PAGE)

  const sorted = useMemo(() => [...state.purchases].sort((a, b) => b.at - a.at), [state.purchases])
  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sorted
      .filter((p) => filter === 'all' || p.status === filter)
      .filter(
        (p) =>
          !q ||
          p.id.toLowerCase().includes(q) ||
          supplierName(state, p.supplierId).toLowerCase().includes(q) ||
          p.lines.some((l) => productById(state, l.productId)?.name.toLowerCase().includes(q)),
      )
  }, [sorted, filter, query, state])

  const bought = state.purchases.filter((p) => p.status === 'delivered')
  const spent = bought.reduce((t, p) => t + purchaseTotal(p), 0)
  const awaiting = state.purchases.filter((p) => p.status === 'planned' || p.status === 'in_transit').length

  const changeFilter = (f: Filter) => {
    setFilter(f)
    setVisible(PAGE)
    setOpen(null)
  }

  return (
    <div className="flex flex-col gap-space-md">
      <div className="grid grid-cols-3 gap-space-xs lg:gap-space-md">
        <Figure label="Spent on received stock" value={rand(spent)} />
        <Figure label="Orders received" value={bought.length} />
        <Figure label="Awaiting delivery" value={awaiting} tone={awaiting ? 'text-primary' : 'text-text-primary'} />
      </div>

      <div className="flex gap-space-xs overflow-x-auto no-scrollbar" role="group" aria-label="Filter purchases by status">
        {FILTERS.map(({ key, label }) => (
          <Chip key={key} selected={filter === key} onClick={() => changeFilter(key)}>
            {label}
          </Chip>
        ))}
      </div>

      <div
        className={cx(
          'hidden lg:grid gap-space-sm px-space-sm font-caption-medium text-caption-medium text-text-secondary uppercase tracking-wide',
          COLS,
        )}
        aria-hidden="true"
      >
        <span>Order</span>
        <span>Supplier</span>
        <span>Date</span>
        <span>Status</span>
        <span className="text-right">Total</span>
        <span />
      </div>

      <ul className="flex flex-col gap-space-xs">
        {results.slice(0, visible).map((p) => {
          const isOpen = open === p.id
          const total = purchaseTotal(p)
          const units = p.lines.length
          const actionable = p.status === 'planned' || p.status === 'in_transit'
          return (
            <li key={p.id} className={cx('rounded-lg border transition-colors', isOpen ? 'border-primary' : 'border-border-default')}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : p.id)}
                aria-expanded={isOpen}
                aria-controls={`po-${p.id}`}
                className={cx(
                  'w-full p-space-sm text-left grid grid-cols-[1fr_auto] items-center gap-x-space-sm gap-y-space-2xs hover:bg-surface-container-low rounded-lg transition-colors',
                  COLS,
                )}
              >
                <span className="font-label-bold text-label-bold text-text-primary">{p.id}</span>
                <span className="lg:hidden font-label-bold text-label-bold text-text-primary text-right">{rand(total)}</span>
                <span className="flex flex-col min-w-0">
                  <span className="font-label text-label text-text-primary truncate">{supplierName(state, p.supplierId)}</span>
                  <span className="font-caption text-caption text-text-secondary truncate">
                    {units} {units === 1 ? 'item' : 'items'} · {p.payment}
                  </span>
                </span>
                <span className="lg:hidden justify-self-end">
                  <StatusPill status={p.status} />
                </span>
                <span className="font-caption text-caption lg:font-label lg:text-label text-text-secondary">{shortDate(p.at)}</span>
                <span className="hidden lg:block">
                  <StatusPill status={p.status} />
                </span>
                <span
                  className={cx(
                    'hidden lg:block text-right font-label-bold text-label-bold',
                    p.status === 'cancelled' ? 'text-text-secondary line-through' : 'text-text-primary',
                  )}
                >
                  {rand(total)}
                </span>
                <Icon
                  name="expand_more"
                  className={cx('hidden lg:block text-text-secondary transition-transform', isOpen && 'rotate-180')}
                />
              </button>

              {isOpen && (
                <div id={`po-${p.id}`} className="px-space-sm pb-space-sm flex flex-col gap-space-sm">
                  <div className="rounded-lg bg-surface-container-low p-space-sm flex flex-col gap-space-xs">
                    {p.lines.map((l) => {
                      const prod = productById(state, l.productId)
                      return (
                        <div key={l.productId} className="flex items-center justify-between gap-space-sm">
                          <div className="flex flex-col min-w-0">
                            <span className="font-label text-label text-text-primary truncate">{prod?.name ?? l.productId}</span>
                            <span className="font-caption text-caption text-text-secondary">
                              {prod ? unitQty(prod, l.qty) : l.qty} × {rand(l.unitPrice)}
                            </span>
                          </div>
                          <span className="font-label-bold text-label-bold text-text-primary shrink-0">{rand(l.qty * l.unitPrice)}</span>
                        </div>
                      )
                    })}
                    <div className="border-t border-border-default pt-space-xs flex items-center justify-between">
                      <span className="font-label-bold text-label-bold text-text-primary">Order total</span>
                      <span className="font-label-bold text-label-bold text-primary">{rand(total)}</span>
                    </div>
                  </div>
                  {actionable && (
                    <div className="flex flex-col sm:flex-row sm:justify-end gap-space-xs">
                      <Button
                        variant="danger"
                        size="sm"
                        icon="cancel"
                        onClick={() => {
                          cancelPurchase(p.id)
                          toast(`${p.id} cancelled.`, 'info')
                        }}
                      >
                        Cancel order
                      </Button>
                      <Button
                        size="sm"
                        icon="inventory"
                        onClick={() => {
                          receivePurchase(p.id)
                          toast(`${p.id} received. Stock updated.`)
                        }}
                      >
                        Mark as received
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {results.length === 0 && <EmptyState icon="receipt_long" title="No purchases found" body="Try a different filter or search term." />}

      {results.length > PAGE && (
        <Button
          variant="ghost"
          className="self-center"
          iconEnd={visible >= results.length ? 'expand_less' : 'expand_more'}
          onClick={() => setVisible(visible >= results.length ? PAGE : results.length)}
        >
          {visible >= results.length ? 'Show fewer' : `Show all ${results.length} purchases`}
        </Button>
      )}
    </div>
  )
}

export default function PurchaseHistory({ initialView = 'purchases' }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView)
  const [query, setQuery] = useState('')

  return (
    <Card className="p-space-lg flex flex-col gap-space-md">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <h2 className="font-h2 text-h2 text-text-primary">Purchase history</h2>
          <span className="font-caption text-caption text-text-secondary">
            {view === 'purchases' ? 'Every stock order placed with your suppliers' : 'What you sold and what is left on the shelf'}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-space-sm">
          <Tabs
            idBase="history"
            label="History pages"
            value={view}
            onChange={(v) => {
              setView(v)
              setQuery('')
            }}
            items={[
              { key: 'purchases', label: 'Purchases', icon: 'receipt_long' },
              { key: 'sales', label: 'Stock & Sales', icon: 'monitoring' },
            ]}
          />
          <SearchField
            className="sm:w-64"
            value={query}
            onChange={setQuery}
            label={view === 'purchases' ? 'Search purchases' : 'Search products'}
            placeholder={view === 'purchases' ? 'Supplier, item or PO' : 'Product or category'}
          />
        </div>
      </div>

      <TabPanel idBase="history" active={view}>
        {view === 'sales' ? <ProductsSold query={query} /> : <Purchases query={query} />}
      </TabPanel>
    </Card>
  )
}
