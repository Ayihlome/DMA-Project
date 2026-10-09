import { useEffect, useId, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useStore } from '../data/store'
import { available, healthOf, pricesFor, productById, stockItems, supplierName, unitQty } from '../data/inventory'
import { CATEGORIES, type CategoryKey, type Product, type SupplierPrice } from '../data/types'
import { rand, relativeTime } from '../lib/format'
import { useToast } from '../components/Toast'
import { Button, Card, EmptyState, Field, Icon, Modal, Pill, ProductThumb, StatusBadge, cx, inputClass } from '../components/ui'

const STALE_DAYS = 14

type Draft = { supplierName: string; location: string; packPrice: string; unitsPerPack: string; minOrder: string }
type ProductDraft = {
  name: string
  detail: string
  category: CategoryKey
  price: string
  stock: string
  unit: string
  unitPlural: string
  packSize: string
}

const BLANK_PRODUCT: ProductDraft = {
  name: '',
  detail: '',
  category: 'pantry',
  price: '',
  stock: '0',
  unit: '',
  unitPlural: '',
  packSize: '1',
}

function ProductModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (product: Product) => void }) {
  const { state, addProduct } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<ProductDraft>(BLANK_PRODUCT)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(BLANK_PRODUCT)
    setTried(false)
  }, [open])

  const price = parseFloat(draft.price)
  const stock = parseFloat(draft.stock)
  const packSize = parseFloat(draft.packSize)
  const errors = {
    name: !draft.name.trim()
      ? 'Enter a product name.'
      : state.products.some((product) => product.name.toLowerCase() === draft.name.trim().toLowerCase())
        ? 'A product with this name already exists.'
        : undefined,
    price: !(price >= 0) ? 'Enter the selling price.' : undefined,
    stock: !(stock >= 0) ? 'Enter 0 or the quantity currently on hand.' : undefined,
    unit: !draft.unit.trim() ? 'Enter the name of one unit.' : undefined,
    unitPlural: !draft.unitPlural.trim() ? 'Enter the plural unit name.' : undefined,
    packSize: !(packSize >= 1) ? 'Enter at least 1 unit per pack.' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)
  const set = (key: keyof ProductDraft) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setDraft((current) => ({ ...current, [key]: event.target.value }))

  function save() {
    setTried(true)
    if (!valid) return
    const product = addProduct({
      name: draft.name,
      detail: draft.detail,
      category: draft.category,
      price,
      stock,
      unit: draft.unit,
      unitPlural: draft.unitPlural,
      packSize,
    })
    toast(`${product.name} was added to your inventory.`)
    onCreated(product)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add individual product"
      description="Create a product you buy, stock, and sell as an individual item."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="add" onClick={save}>
            Add product
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-space-sm"
        onSubmit={(event) => {
          event.preventDefault()
          save()
        }}
      >
        <Field label="Product name" error={tried ? errors.name : undefined}>
          {(id) => <input id={id} className={inputClass} value={draft.name} onChange={set('name')} placeholder="e.g. Orange Juice 1L" />}
        </Field>
        <Field label="Description (optional)">
          {(id) => <input id={id} className={inputClass} value={draft.detail} onChange={set('detail')} placeholder="e.g. 100% fruit juice" />}
        </Field>
        <Field label="Category">
          {(id) => (
            <select id={id} className={cx(inputClass, 'cursor-pointer')} value={draft.category} onChange={set('category')}>
              {CATEGORIES.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-space-sm">
          <Field label="Selling price (R)" error={tried ? errors.price : undefined}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={draft.price}
                onChange={set('price')}
                placeholder="0.00"
              />
            )}
          </Field>
          <Field label="Current stock" error={tried ? errors.stock : undefined}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={draft.stock}
                onChange={set('stock')}
              />
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-space-sm">
          <Field label="Unit name" error={tried ? errors.unit : undefined} hint="What one item is called.">
            {(id) => <input id={id} className={inputClass} value={draft.unit} onChange={set('unit')} placeholder="bottle" />}
          </Field>
          <Field label="Plural unit" error={tried ? errors.unitPlural : undefined}>
            {(id) => <input id={id} className={inputClass} value={draft.unitPlural} onChange={set('unitPlural')} placeholder="bottles" />}
          </Field>
        </div>
        <Field label="Units in a supplier pack" error={tried ? errors.packSize : undefined} hint="Use 1 if suppliers sell this item individually.">
          {(id) => (
            <input
              id={id}
              className={inputClass}
              type="number"
              inputMode="decimal"
              min="1"
              step="any"
              value={draft.packSize}
              onChange={set('packSize')}
            />
          )}
        </Field>
        <button type="submit" className="sr-only">
          Add product
        </button>
      </form>
    </Modal>
  )
}

function PriceModal({
  product,
  open,
  onClose,
  initial,
}: {
  product: Product
  open: boolean
  onClose: () => void
  initial?: SupplierPrice
}) {
  const { state, upsertSupplierPrice } = useStore()
  const toast = useToast()
  const listId = useId()
  const blank: Draft = { supplierName: '', location: '', packPrice: '', unitsPerPack: String(product.packSize), minOrder: '' }
  const [d, setD] = useState<Draft>(blank)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setTried(false)
    setD(
      initial
        ? {
            supplierName: supplierName(state, initial.supplierId),
            location: state.suppliers.find((s) => s.id === initial.supplierId)?.location ?? '',
            packPrice: (initial.unitPrice * product.packSize).toFixed(2),
            unitsPerPack: String(product.packSize),
            minOrder: initial.minOrder ? String(initial.minOrder) : '',
          }
        : blank,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, product.id])

  const pack = parseFloat(d.packPrice)
  const per = parseFloat(d.unitsPerPack)
  const min = d.minOrder ? parseFloat(d.minOrder) : undefined
  const errors = {
    supplierName: !d.supplierName.trim() ? 'Enter the supplier name.' : undefined,
    packPrice: !(pack > 0) ? 'Enter a price above R0.' : undefined,
    unitsPerPack: !(per > 0) ? 'Enter how many units are in the pack.' : undefined,
    minOrder: min !== undefined && !(min > 0) ? 'Leave empty or enter a number above 0.' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)
  const unitPrice = valid ? Math.round((pack / per) * 100) / 100 : null

  function save() {
    setTried(true)
    if (!valid || unitPrice === null) return
    upsertSupplierPrice({ productId: product.id, supplierName: d.supplierName, unitPrice, minOrder: min, location: d.location })
    toast(`Saved ${rand(unitPrice)} per ${product.unit} from ${d.supplierName.trim()}.`)
    onClose()
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: e.target.value })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Update supplier price' : 'Add supplier price'}
      description={`${product.name} · prices are saved on this device and synced when online.`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button icon="check" onClick={save}>
            Save price
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-space-sm"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <Field label="Supplier name" error={tried ? errors.supplierName : undefined}>
          {(id) => (
            <>
              <input
                id={id}
                list={listId}
                className={inputClass}
                value={d.supplierName}
                onChange={set('supplierName')}
                placeholder="e.g. Jumbo Cash & Carry"
                autoComplete="off"
                readOnly={!!initial}
              />
              <datalist id={listId}>
                {state.suppliers.map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </>
          )}
        </Field>
        {!initial && (
          <Field label="Location (optional)">
            {(id) => <input id={id} className={inputClass} value={d.location} onChange={set('location')} placeholder="e.g. Crown Mines" />}
          </Field>
        )}
        <div className="grid grid-cols-2 gap-space-sm">
          <Field label="Pack price (R)" error={tried ? errors.packPrice : undefined}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                inputMode="decimal"
                type="number"
                min="0"
                step="0.01"
                value={d.packPrice}
                onChange={set('packPrice')}
                placeholder="132.00"
              />
            )}
          </Field>
          <Field label={`${product.unitPlural} per pack`} error={tried ? errors.unitsPerPack : undefined}>
            {(id) => (
              <input
                id={id}
                className={inputClass}
                inputMode="decimal"
                type="number"
                min="0"
                step="any"
                value={d.unitsPerPack}
                onChange={set('unitsPerPack')}
              />
            )}
          </Field>
        </div>
        <Field label={`Minimum order (${product.unitPlural}, optional)`} error={tried ? errors.minOrder : undefined}>
          {(id) => (
            <input
              id={id}
              className={inputClass}
              inputMode="decimal"
              type="number"
              min="0"
              step="any"
              value={d.minOrder}
              onChange={set('minOrder')}
            />
          )}
        </Field>
        <p className="p-space-sm rounded-lg bg-accent-tint text-primary font-label text-label flex items-center gap-space-xs">
          <Icon name="calculate" />
          {unitPrice !== null ? `${rand(unitPrice)} per ${product.unit}` : 'Enter the pack price to see the unit price'}
        </p>
        <button type="submit" className="sr-only">
          Save price
        </button>
      </form>
    </Modal>
  )
}

function Sparkline({ points, label }: { points: { at: number; price: number }[]; label: string }) {
  if (points.length < 2)
    return (
      <p className="font-caption text-caption text-text-secondary">Not enough history yet. Update the price over time to see a trend.</p>
    )
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const span = max - min || 1
  const xy = points.map((p, i) => [(i / (points.length - 1)) * 300, 34 - ((p.price - min) / span) * 28] as const)
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox="0 0 300 40" preserveAspectRatio="none" className="w-full h-12 overflow-visible" role="img" aria-label={label}>
      <path d={`${d} L300,40 L0,40 Z`} className="fill-accent-tint" />
      <path
        d={d}
        fill="none"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={xy.at(-1)![0]} cy={xy.at(-1)![1]} r="3.5" className="fill-brand-purple" />
    </svg>
  )
}

export default function Supply() {
  const { state, setPreferredSupplier } = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const items = stockItems(state)
  const product = productById(state, params.get('item') ?? '') ?? items.find((p) => healthOf(state, p) !== 'healthy') ?? items[0]
  const prices = useMemo(() => pricesFor(state, product.id), [state, product.id])
  const preferred = state.preferred[product.id] ?? prices[0]?.supplierId
  const [selected, setSelected] = useState(preferred)
  const [modal, setModal] = useState<{ open: boolean; edit?: SupplierPrice }>({ open: false })
  const [productModalOpen, setProductModalOpen] = useState(false)
  const selectId = useId()

  useEffect(() => setSelected(state.preferred[product.id] ?? pricesFor(state, product.id)[0]?.supplierId), [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cheapest = prices[0]
  const dearest = prices.at(-1)
  const chosen = prices.find((p) => p.supplierId === selected)
  const applied = selected === state.preferred[product.id]

  return (
    <div className="w-full px-space-md py-space-md lg:max-w-5xl lg:mx-auto lg:px-space-xl lg:py-space-lg flex flex-col gap-space-md">
      <h1 className="sr-only">Compare supplier prices</h1>

      {/* Item selector */}
      <Card className="p-space-md flex flex-col gap-space-sm">
        <div className="flex items-center justify-between gap-space-sm">
          <label htmlFor={selectId} className="font-caption-medium text-caption-medium text-text-secondary uppercase tracking-wide">
            Item to compare
          </label>
          <Button variant="ghost" size="sm" icon="add" onClick={() => setProductModalOpen(true)}>
            Add product
          </Button>
        </div>
        <div className="flex items-center gap-space-sm">
          <ProductThumb product={product} />
          <div className="relative flex-1 min-w-0">
            <select
              id={selectId}
              value={product.id}
              onChange={(e) => setParams({ item: e.target.value }, { replace: true })}
              className={cx(inputClass, 'appearance-none pr-10 font-label-bold text-label-bold truncate cursor-pointer')}
            >
              {items.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Icon name="unfold_more" className="absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-xs font-caption text-caption text-text-secondary">
          <StatusBadge health={healthOf(state, product)} />
          <span>
            {unitQty(product, available(state, product))} on hand · sold by the {product.packLabel}
          </span>
        </div>
        {cheapest && (
          <div className="grid grid-cols-2 gap-space-xs">
            <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center gap-space-xs">
              <Icon name="trending_down" className="text-best-value" />
              <div className="flex flex-col min-w-0">
                <span className="font-caption text-caption text-text-secondary">Lowest unit price</span>
                <span className="font-label-bold text-label-bold text-text-primary">
                  {rand(cheapest.unitPrice)} <span className="font-caption text-caption text-text-secondary">/ {product.unit}</span>
                </span>
              </div>
            </div>
            <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center gap-space-xs">
              <Icon name="savings" className="text-brand-purple" />
              <div className="flex flex-col min-w-0">
                <span className="font-caption text-caption text-text-secondary">Saving vs. dearest</span>
                <span className="font-label-bold text-label-bold text-secondary">
                  {rand((dearest!.unitPrice - cheapest.unitPrice) * product.packSize)}{' '}
                  <span className="font-caption text-caption text-text-secondary">/ {product.packLabel}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Quotes */}
      <div className="flex items-center justify-between px-space-2xs">
        <h2 className="font-label-bold text-label-bold text-text-primary flex items-center gap-space-xs">
          Saved supplier prices <Pill>{prices.length}</Pill>
        </h2>
        <span className="font-caption text-caption text-text-secondary">Cheapest first</span>
      </div>

      {prices.length === 0 ? (
        <Card>
          <EmptyState icon="storefront" title="No prices saved for this item" body="Add a quote or invoice price to compare suppliers." />
        </Card>
      ) : (
        <fieldset className="flex flex-col gap-space-sm">
          <legend className="sr-only">Choose a supplier for {product.name}</legend>
          {prices.map((p, i) => {
            const isCheapest = i === 0
            const delta = p.unitPrice - cheapest.unitPrice
            const stale = Date.now() - p.updatedAt > STALE_DAYS * 86_400_000
            const supplier = state.suppliers.find((s) => s.id === p.supplierId)
            const isSel = selected === p.supplierId
            return (
              <div
                key={p.id}
                className={cx(
                  'relative bg-bg-surface rounded-xl p-space-md shadow-sm border-2 transition-colors',
                  isSel ? 'border-primary' : 'border-transparent',
                )}
              >
                <label className="flex items-start gap-space-sm cursor-pointer">
                  <input
                    type="radio"
                    name="supplier"
                    checked={isSel}
                    onChange={() => setSelected(p.supplierId)}
                    className="mt-1 w-5 h-5 accent-primary shrink-0"
                  />
                  <span className="flex-1 min-w-0 flex flex-col gap-space-2xs">
                    <span className="flex flex-wrap items-center gap-space-xs">
                      {isCheapest ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-best-value text-on-secondary font-label-bold text-caption-medium uppercase tracking-wide">
                          <Icon name="verified" size="xs" /> Cheapest
                        </span>
                      ) : (
                        <Pill icon="arrow_upward">
                          +{rand(delta)} / {product.unit}
                        </Pill>
                      )}
                      {state.preferred[product.id] === p.supplierId && (
                        <Pill tone="purple" icon="bookmark">
                          In restock plan
                        </Pill>
                      )}
                      <span
                        className={cx(
                          'font-caption text-caption inline-flex items-center gap-0.5',
                          stale ? 'text-tertiary' : 'text-text-secondary',
                        )}
                      >
                        <Icon name={stale ? 'history' : 'schedule'} size="xs" /> Updated {relativeTime(p.updatedAt)}
                      </span>
                    </span>
                    <span className="flex items-baseline justify-between gap-space-sm">
                      <span className="font-label-bold text-label-bold text-text-primary truncate">{supplier?.name}</span>
                      <span className="font-h1 text-h1 text-text-primary shrink-0">
                        {rand(p.unitPrice)}
                        <span className="font-caption text-caption text-text-secondary"> / {product.unit}</span>
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center justify-between gap-space-xs font-caption text-caption text-text-secondary">
                      <span>
                        {product.packLabel}:{' '}
                        <strong className="font-caption-medium text-text-primary">{rand(p.unitPrice * product.packSize)}</strong>
                        {!isCheapest && ` (+${rand(delta * product.packSize)})`}
                      </span>
                      <span className="flex items-center gap-space-sm">
                        {supplier?.location && (
                          <span className="inline-flex items-center gap-0.5">
                            <Icon name="location_on" size="xs" />
                            {supplier.location}
                          </span>
                        )}
                        {p.minOrder && <span>Min. {unitQty(product, p.minOrder)}</span>}
                      </span>
                    </span>
                  </span>
                </label>
                <div className="flex justify-end pt-space-xs">
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="edit"
                    onClick={() => setModal({ open: true, edit: p })}
                    aria-label={`Update ${supplier?.name} price`}
                  >
                    Update price
                  </Button>
                </div>
              </div>
            )
          })}
        </fieldset>
      )}

      {/* Dashed outline is reserved for this add placeholder (PRD 6.1) */}
      <button
        type="button"
        onClick={() => setModal({ open: true })}
        className="w-full min-h-24 p-space-md rounded-xl border-2 border-dashed border-border-disabled flex flex-col items-center justify-center gap-space-2xs text-center hover:bg-bg-surface hover:border-primary transition-colors"
      >
        <span className="w-10 h-10 rounded-full bg-accent-tint text-primary flex items-center justify-center">
          <Icon name="add" size="lg" />
        </span>
        <span className="font-label-bold text-label-bold text-text-primary">Add supplier price</span>
        <span className="font-caption text-caption text-text-secondary">Log a quote or invoice price from a supplier</span>
      </button>

      {chosen && (
        <Card className="p-space-md flex flex-col gap-space-xs">
          <div className="flex items-center justify-between gap-space-sm">
            <h2 className="font-label-bold text-label-bold text-text-primary truncate">
              Price history · {supplierName(state, chosen.supplierId)}
            </h2>
            {chosen.history.length > 1 &&
              (() => {
                const first = chosen.history[0].price
                const change = ((chosen.unitPrice - first) / first) * 100
                return (
                  <span
                    className={cx(
                      'font-caption-medium text-caption-medium inline-flex items-center gap-0.5 shrink-0',
                      change <= 0 ? 'text-secondary' : 'text-error-default',
                    )}
                  >
                    <Icon name={change <= 0 ? 'south_east' : 'north_east'} size="sm" /> {change > 0 ? '+' : ''}
                    {change.toFixed(1)}%
                  </span>
                )
              })()}
          </div>
          <Sparkline points={chosen.history} label={`Price history: ${chosen.history.map((h) => rand(h.price)).join(', ')}`} />
          {chosen.history.length > 1 && (
            <div className="flex justify-between font-caption text-caption text-text-secondary">
              <span>
                {relativeTime(chosen.history[0].at)}: {rand(chosen.history[0].price)}
              </span>
              <span>Now: {rand(chosen.unitPrice)}</span>
            </div>
          )}
        </Card>
      )}

      {chosen && (
        <Button
          block
          variant={applied ? 'success' : 'primary'}
          icon={applied ? 'check' : 'playlist_add_check'}
          disabled={applied}
          onClick={() => {
            setPreferredSupplier(product.id, chosen.supplierId)
            toast(`${supplierName(state, chosen.supplierId)} will be used for ${product.name} in your restock plan.`)
          }}
        >
          {applied
            ? `Using ${supplierName(state, chosen.supplierId)} in restock plan`
            : `Use ${supplierName(state, chosen.supplierId)} in restock plan`}
        </Button>
      )}

      <PriceModal product={product} open={modal.open} initial={modal.edit} onClose={() => setModal({ open: false })} />
      <ProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onCreated={(created) => {
          setProductModalOpen(false)
          setParams({ item: created.id }, { replace: true })
        }}
      />
    </div>
  )
}
