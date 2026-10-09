import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useStore } from '../data/store'
import {
  healthOf,
  pricesFor,
  productById,
  purchaseTotal,
  recommendations,
  stockItems,
  supplierName,
  unitQty,
  type Recommendation,
} from '../data/inventory'
import type { Purchase } from '../data/types'
import { rand } from '../lib/format'
import { useToast } from '../components/Toast'
import { Button, Card, EmptyState, Field, Icon, Modal, Pill, ProductThumb, StatusBadge, cx, inputClass } from '../components/ui'

type Line = { productId: string; qty: number; supplierId: string; include: boolean; custom?: boolean }

function priceOf(state: ReturnType<typeof useStore>['state'], productId: string, supplierId: string) {
  const p = pricesFor(state, productId)
  return (p.find((x) => x.supplierId === supplierId) ?? p[0])?.unitPrice ?? productById(state, productId)?.cost ?? 0
}

function AddItemModal({
  open,
  onClose,
  exclude,
  onAdd,
}: {
  open: boolean
  onClose: () => void
  exclude: string[]
  onAdd: (productId: string, qty: number) => void
}) {
  const { state } = useStore()
  const options = stockItems(state).filter((p) => !exclude.includes(p.id))
  const [id, setId] = useState('')
  const [packs, setPacks] = useState('1')
  const product = productById(state, id || options[0]?.id || '')
  const n = parseInt(packs, 10)
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add another item"
      description="Add something that isn't recommended yet. You stay in control of the plan."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            icon="add"
            disabled={!product || !(n > 0)}
            onClick={() => {
              if (product) {
                onAdd(product.id, n * product.packSize)
                onClose()
                setPacks('1')
                setId('')
              }
            }}
          >
            Add to plan
          </Button>
        </>
      }
    >
      {options.length === 0 || !product ? (
        <EmptyState icon="inventory_2" title="Every item is already in the plan" />
      ) : (
        <div className="flex flex-col gap-space-sm">
          <Field label="Item">
            {(fid) => (
              <select id={fid} className={cx(inputClass, 'cursor-pointer')} value={product.id} onChange={(e) => setId(e.target.value)}>
                {options.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {unitQty(p, p.stock)} on hand
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field
            label={`How many (${product.packLabel})`}
            hint={
              n > 0
                ? `${unitQty(product, n * product.packSize)} at about ${rand(priceOf(state, product.id, '') * n * product.packSize)}`
                : undefined
            }
          >
            {(fid) => (
              <input
                id={fid}
                type="number"
                min="1"
                inputMode="numeric"
                className={inputClass}
                value={packs}
                onChange={(e) => setPacks(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}
    </Modal>
  )
}

function OrderCreated({ orders, onDone }: { orders: Purchase[]; onDone: () => void }) {
  const { state } = useStore()
  const text = orders
    .map(
      (o) =>
        `${supplierName(state, o.supplierId)} (${o.id})\n${o.lines
          .map((l) => {
            const p = productById(state, l.productId)!
            return `- ${unitQty(p, l.qty)} ${p.name} @ ${rand(l.unitPrice)}`
          })
          .join('\n')}\nTotal ${rand(purchaseTotal(o))}`,
    )
    .join('\n\n')
  return (
    <Card className="p-space-lg flex flex-col gap-space-md">
      <div className="flex items-start gap-space-sm">
        <span className="w-10 h-10 rounded-full bg-success-tint text-secondary flex items-center justify-center shrink-0">
          <Icon name="task_alt" />
        </span>
        <div>
          <h2 className="font-h2 text-h2 text-text-primary">Restock order list created</h2>
          <p className="font-caption text-caption text-text-secondary">
            Nothing has been sent to suppliers. Take this list with you, then mark each order as received to add the stock.
          </p>
        </div>
      </div>
      <ul className="flex flex-col gap-space-sm">
        {orders.map((o) => (
          <li key={o.id} className="rounded-lg border border-border-default p-space-sm flex flex-col gap-space-2xs">
            <span className="flex items-center justify-between font-label-bold text-label-bold text-text-primary">
              <span>
                {supplierName(state, o.supplierId)} <span className="font-caption text-caption text-text-secondary">· {o.id}</span>
              </span>
              <span>{rand(purchaseTotal(o))}</span>
            </span>
            {o.lines.map((l) => {
              const p = productById(state, l.productId)!
              return (
                <span key={l.productId} className="flex justify-between font-caption text-caption text-text-secondary">
                  <span>
                    {unitQty(p, l.qty)} {p.name}
                  </span>
                  <span>{rand(l.qty * l.unitPrice)}</span>
                </span>
              )
            })}
          </li>
        ))}
      </ul>
      <div className="flex flex-col sm:flex-row gap-space-xs">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`StockEvo restock list\n\n${text}`)}`}
          target="_blank"
          rel="noreferrer"
          className="min-h-tap px-space-md rounded-lg bg-primary text-on-primary font-label-bold text-label-bold inline-flex items-center justify-center gap-space-xs hover:bg-accent-pressed"
        >
          <Icon name="share" /> Share list
        </a>
        <Link
          to="/profile?history=purchases"
          className="min-h-tap px-space-md rounded-lg border border-primary text-primary font-label-bold text-label-bold inline-flex items-center justify-center gap-space-xs hover:bg-accent-tint"
        >
          <Icon name="receipt_long" /> View in purchase history
        </Link>
        <Button variant="ghost" onClick={onDone}>
          Back to plan
        </Button>
      </div>
    </Card>
  )
}

export default function Restock() {
  const { state, setBudget, createOrderList } = useStore()
  const toast = useToast()
  const recs = useMemo(() => recommendations(state), [state])
  const onOrder = useMemo(() => {
    const m = new Map<string, string>()
    for (const po of state.purchases)
      if (po.status === 'planned' || po.status === 'in_transit') for (const l of po.lines) m.set(l.productId, po.id)
    return m
  }, [state.purchases])

  const initial = (): Line[] =>
    recs.map((r) => ({ productId: r.product.id, qty: r.qty, supplierId: r.supplierId, include: !onOrder.has(r.product.id) }))
  const [lines, setLines] = useState<Line[]>(initial)
  const [open, setOpen] = useState<Set<string>>(() => new Set(recs[0] ? [recs[0].product.id] : []))
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState<Purchase[] | null>(null)
  const [budgetText, setBudgetText] = useState(String(state.budget))

  const recOf = (id: string): Recommendation | undefined => recs.find((r) => r.product.id === id)
  const lineCost = (l: Line) => Math.round(l.qty * priceOf(state, l.productId, l.supplierId) * 100) / 100
  const included = lines.filter((l) => l.include && l.qty > 0)
  const total = included.reduce((t, l) => t + lineCost(l), 0)
  const budget = state.budget
  const remaining = budget - total
  const over = remaining < 0
  const pct = budget > 0 ? Math.min(100, (total / budget) * 100) : total > 0 ? 100 : 0

  const update = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, ...patch } : l)))
  const toggleOpen = (id: string) =>
    setOpen((s) => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  function commitBudget(v: string) {
    setBudgetText(v)
    const n = parseFloat(v)
    setBudget(Number.isFinite(n) ? n : 0)
  }

  function create() {
    if (over || included.length === 0) return
    const orders = createOrderList(
      included.map((l) => ({
        productId: l.productId,
        qty: l.qty,
        supplierId: l.supplierId,
        unitPrice: priceOf(state, l.productId, l.supplierId),
      })),
    )
    setLines((ls) => ls.map((l) => (l.include ? { ...l, include: false } : l)))
    setCreated(orders)
    toast(`Order list created for ${orders.length} ${orders.length === 1 ? 'supplier' : 'suppliers'}.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="w-full pb-48 lg:pb-40 lg:max-w-4xl lg:mx-auto lg:px-space-xl lg:pt-space-lg">
      <div className="px-space-md lg:px-0 pt-space-md pb-space-sm">
        <h1 className="font-h2 text-h2 text-text-primary flex items-center gap-space-xs">
          <Icon name="checklist" className="text-brand-purple" /> Restock plan
        </h1>
        <p className="font-caption text-caption text-text-secondary mt-space-2xs">
          Ordered by how soon items run out, using your chosen or cheapest saved supplier price.
        </p>
      </div>

      {created && (
        <div className="px-space-md lg:px-0 mb-space-md">
          <OrderCreated orders={created} onDone={() => setCreated(null)} />
        </div>
      )}

      {/* Budget meter */}
      <div className="px-space-md lg:px-0 mb-space-md">
        <Card className="p-space-md flex flex-col gap-space-sm">
          <div className="flex items-start justify-between gap-space-md">
            <div className="flex flex-col">
              <label htmlFor="budget" className="font-caption text-caption text-text-secondary">
                Available budget
              </label>
              <div className="flex items-center gap-space-2xs mt-space-2xs">
                <span className="font-display text-display text-text-primary">R</span>
                <input
                  id="budget"
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="50"
                  value={budgetText}
                  onChange={(e) => commitBudget(e.target.value)}
                  className="font-display text-display text-text-primary w-36 bg-surface-container-low rounded-lg px-space-xs outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <div className="text-right">
              <span className="font-caption text-caption text-text-secondary">Allocated</span>
              <div className="font-label-bold text-label-bold text-text-primary mt-space-2xs">{rand(total)}</div>
              <span className="font-caption-medium text-caption-medium text-text-secondary">{pct.toFixed(0)}% used</span>
            </div>
          </div>
          <div
            role="meter"
            aria-label="Budget used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-valuetext={`${rand(total)} of ${rand(budget)}`}
            className="w-full bg-surface-container rounded-full h-3 overflow-hidden"
          >
            <div
              className={cx('h-full rounded-full transition-all duration-300', over ? 'bg-error-default' : 'bg-brand-gradient')}
              style={{ width: `${over ? 100 : pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-space-sm">
            <Pill tone={over ? 'error' : 'success'} icon={over ? 'warning' : 'check_circle'}>
              {over ? `${rand(-remaining)} over budget` : `${rand(remaining)} left`}
            </Pill>
            <Button variant="ghost" size="sm" icon="add" onClick={() => commitBudget(String(budget + 500))}>
              R500
            </Button>
          </div>
          {over && (
            <p
              role="alert"
              className="flex items-center gap-space-xs p-space-sm rounded-lg bg-error-tint text-error-default font-caption-medium text-caption-medium"
            >
              <Icon name="error" /> Over budget. Remove items or raise the budget to create the order list.
            </p>
          )}
        </Card>
      </div>

      {/* Recommendations */}
      <section className="px-space-md lg:px-0 flex flex-col gap-space-sm" aria-labelledby="recs-title">
        <div className="flex items-center justify-between px-space-2xs">
          <h2 id="recs-title" className="font-label-bold text-label-bold text-text-primary">
            Recommended items ({lines.length})
          </h2>
          <span className="font-caption text-caption text-text-secondary">Most urgent first</span>
        </div>

        {lines.length === 0 && (
          <Card>
            <EmptyState
              icon="verified"
              title="Nothing needs restocking"
              body="All stock items are above their safe levels. You can still add items yourself."
            />
          </Card>
        )}

        {lines.map((l) => {
          const p = productById(state, l.productId)!
          const rec = recOf(p.id)
          const health = rec?.health ?? healthOf(state, p)
          const options = pricesFor(state, p.id)
          const cheapest = options[0]?.unitPrice ?? 0
          const isOpen = open.has(p.id)
          const poId = onOrder.get(p.id)
          return (
            <Card key={p.id} className={cx('p-space-md flex flex-col gap-space-sm transition-opacity', !l.include && 'opacity-75')}>
              <div className="flex items-start gap-space-sm">
                <input
                  type="checkbox"
                  checked={l.include}
                  onChange={(e) => update(p.id, { include: e.target.checked })}
                  aria-label={`Include ${p.name} in the order list`}
                  className="mt-space-2xs w-6 h-6 accent-primary cursor-pointer shrink-0"
                />
                <ProductThumb product={p} size="sm" />
                <div className="flex-1 min-w-0 flex flex-col gap-space-2xs">
                  <div className="flex flex-wrap items-center gap-space-xs">
                    {l.custom ? (
                      <Pill tone="purple" icon="person">
                        Added by you
                      </Pill>
                    ) : (
                      <StatusBadge health={health} solid />
                    )}
                    {poId && (
                      <Pill tone="brand" icon="local_shipping">
                        On order · {poId}
                      </Pill>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between gap-space-sm">
                    <h3 className="font-h2 text-h2 text-text-primary truncate">{p.name}</h3>
                    <span className="font-label-bold text-label-bold text-text-primary shrink-0">{rand(lineCost(l))}</span>
                  </div>
                  <span className="font-caption text-caption text-text-secondary">{unitQty(p, p.stock)} on hand</span>
                </div>
              </div>

              <div className="grid gap-space-sm sm:grid-cols-2">
                {/* Quantity in pack steps */}
                <div className="flex items-center justify-between gap-space-xs rounded-lg bg-bg-base p-space-xs">
                  <span className="font-caption-medium text-caption-medium text-text-secondary pl-space-2xs">Quantity</span>
                  <div className="flex items-center bg-bg-surface rounded-lg shadow-sm">
                    <button
                      type="button"
                      aria-label={`Fewer ${p.name}`}
                      disabled={l.qty <= p.packSize}
                      onClick={() => update(p.id, { qty: Math.round((l.qty - p.packSize) * 100) / 100 })}
                      className="w-tap h-tap flex items-center justify-center rounded-l-lg hover:bg-surface-container disabled:opacity-40"
                    >
                      <Icon name="remove" />
                    </button>
                    <span className="min-w-20 text-center font-label-bold text-label-bold text-text-primary" aria-live="polite">
                      {unitQty(p, l.qty)}
                    </span>
                    <button
                      type="button"
                      aria-label={`More ${p.name}`}
                      onClick={() => update(p.id, { qty: Math.round((l.qty + p.packSize) * 100) / 100 })}
                      className="w-tap h-tap flex items-center justify-center rounded-r-lg hover:bg-surface-container"
                    >
                      <Icon name="add" />
                    </button>
                  </div>
                </div>
                {/* Supplier choice */}
                <label className="flex items-center gap-space-xs rounded-lg bg-bg-base p-space-xs">
                  <Icon name="storefront" className="text-brand-green pl-space-2xs" />
                  <span className="sr-only">Supplier for {p.name}</span>
                  <select
                    value={l.supplierId}
                    onChange={(e) => update(p.id, { supplierId: e.target.value })}
                    className="flex-1 min-w-0 min-h-tap bg-transparent font-caption-medium text-caption-medium text-text-primary outline-none cursor-pointer"
                  >
                    {options.map((o) => (
                      <option key={o.supplierId} value={o.supplierId}>
                        {supplierName(state, o.supplierId)} · {rand(o.unitPrice)}
                        {o.unitPrice > cheapest ? ` (+${rand(o.unitPrice - cheapest)})` : ' · cheapest'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {rec && (
                <div>
                  <button
                    type="button"
                    onClick={() => toggleOpen(p.id)}
                    aria-expanded={isOpen}
                    aria-controls={`why-${p.id}`}
                    className="w-full min-h-10 flex items-center justify-between font-caption-medium text-caption-medium text-primary"
                  >
                    <span className="flex items-center gap-space-2xs">
                      <Icon name="info" size="sm" /> Why this item?
                    </span>
                    <Icon name="expand_more" className={cx('transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <ul
                      id={`why-${p.id}`}
                      className="mt-space-2xs p-space-sm rounded-lg bg-surface-container-low flex flex-col gap-space-2xs font-caption text-caption text-text-secondary"
                    >
                      {rec.reasons.map((r, i) => (
                        <li key={i} className="flex gap-space-xs">
                          <Icon
                            name={['inventory', 'speed', 'event_available', 'sell'][i] ?? 'check'}
                            size="sm"
                            className={i === 0 ? 'text-error-default' : 'text-primary'}
                          />
                          <span className={i === 0 ? 'font-caption-medium text-caption-medium text-text-primary' : undefined}>{r}</span>
                        </li>
                      ))}
                      <li className="flex gap-space-xs">
                        <Icon name="account_balance_wallet" size="sm" className="text-brand-purple" />
                        <span>
                          {lineCost(l) <= budget
                            ? `Fits your budget: ${Math.round((lineCost(l) / Math.max(budget, 1)) * 100)}% of ${rand(budget)}.`
                            : `Costs more than your whole budget of ${rand(budget)}.`}
                        </span>
                      </li>
                    </ul>
                  )}
                </div>
              )}
              {l.custom && (
                <div className="flex justify-end">
                  <Button variant="danger" size="sm" icon="delete" onClick={() => setLines((ls) => ls.filter((x) => x.productId !== p.id))}>
                    Remove
                  </Button>
                </div>
              )}
            </Card>
          )
        })}

        <button
          type="button"
          onClick={() => setAdding(true)}
          className="w-full min-h-14 rounded-xl border-2 border-dashed border-border-disabled flex items-center justify-center gap-space-xs text-text-secondary hover:text-primary hover:border-primary transition-colors"
        >
          <Icon name="add_circle" />
          <span className="font-label-bold text-label-bold">Add another item</span>
        </button>
      </section>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-app-nav lg:bottom-0 lg:left-64 z-40 bg-bg-surface px-space-md py-space-sm shadow-bar-up">
        <div className="max-w-4xl mx-auto flex flex-col gap-space-xs">
          <div className="flex items-center justify-between font-caption-medium text-caption-medium">
            <span className="text-text-primary">
              {included.length} {included.length === 1 ? 'item' : 'items'} ·{' '}
              <span className="font-label-bold text-label-bold">{rand(total)}</span>
            </span>
            <span className={cx('inline-flex items-center gap-space-2xs', over ? 'text-error-default' : 'text-secondary')}>
              <Icon name={over ? 'error' : 'verified'} size="sm" /> {over ? 'Over budget' : 'Within budget'}
            </span>
          </div>
          <Button block icon={over ? 'block' : 'shopping_bag'} disabled={over || included.length === 0} onClick={create}>
            {over ? 'Over budget' : included.length === 0 ? 'Select items to order' : 'Create restock order list'}
          </Button>
        </div>
      </div>

      <AddItemModal
        open={adding}
        onClose={() => setAdding(false)}
        exclude={lines.map((l) => l.productId)}
        onAdd={(productId, qty) => {
          const supplierId = state.preferred[productId] ?? pricesFor(state, productId)[0]?.supplierId ?? ''
          setLines((ls) => [...ls, { productId, qty, supplierId, include: true, custom: true }])
        }}
      />
    </div>
  )
}
