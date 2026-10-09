import { useMemo, useState } from 'react'
import { useStore } from '../data/store'
import { available, deductionsFor, healthOf, productById, unitQty } from '../data/inventory'
import { CATEGORIES, categoryLabel, type CategoryKey, type Product } from '../data/types'
import { rand } from '../lib/format'
import { compressImage } from '../lib/image'
import { useToast } from '../components/Toast'
import { Button, Chip, EmptyState, Icon, Modal, ProductThumb, SearchField, cx } from '../components/ui'

type Line = { productId: string; qty: number }

function ProductTile({ product, inCart, onAdd }: { product: Product; inCart: number; onAdd: () => void }) {
  const { state } = useStore()
  const health = healthOf(state, product)
  const left = available(state, product) - inCart
  const blocked = health === 'setup'
  const soldOut = !blocked && left <= 0
  const stockTone =
    health === 'healthy'
      ? 'bg-secondary text-on-secondary'
      : health === 'low'
        ? 'bg-warning-default text-on-primary'
        : 'bg-error-default text-on-error'

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={blocked || soldOut}
      aria-label={`Add ${product.name}, ${rand(product.price)}${blocked ? ', unavailable: recipe missing' : soldOut ? ', none left' : `, ${left} left`}`}
      className={cx(
        'group flex flex-col text-left p-space-sm rounded-xl bg-bg-surface shadow-sm transition-all',
        blocked || soldOut ? 'opacity-80 cursor-not-allowed' : 'hover:shadow-float active:scale-98',
      )}
    >
      <div className="relative h-24 w-full rounded-lg overflow-hidden mb-space-xs">
        <ProductThumb product={product} size="fill" grayscale={blocked || soldOut} />
        {blocked ? (
          <span className="absolute inset-0 bg-surface-dim/50 flex items-center justify-center">
            <Icon name="lock" size="xl" className="text-error-default" />
          </span>
        ) : (
          <span
            className={cx(
              'absolute top-space-2xs right-space-2xs px-2 py-0.5 rounded-full font-caption-medium text-caption-medium inline-flex items-center gap-0.5',
              soldOut ? 'bg-error-default text-on-error' : stockTone,
            )}
          >
            {health !== 'healthy' && <Icon name={soldOut || health !== 'low' ? 'warning' : 'flag'} size="xs" />}
            {soldOut ? 'None left' : product.composite ? `${left} can be made` : `${left} left`}
          </span>
        )}
      </div>
      <span className="font-label-bold text-label-bold text-text-primary line-clamp-1">{product.name}</span>
      <span className="font-caption text-caption text-text-secondary line-clamp-1">
        {product.composite ? product.detail : `${categoryLabel(product.category)} · ${product.detail}`}
      </span>
      {blocked && (
        <span className="mt-space-2xs p-space-2xs rounded-md bg-error-tint font-caption text-caption text-error-default flex items-start gap-space-2xs">
          <Icon name="warning" size="xs" className="mt-0.5" />
          Recipe missing, so stock can't be deducted
        </span>
      )}
      <span className="mt-auto pt-space-xs flex items-center justify-between">
        <span className={cx('font-h2 text-h2', blocked ? 'text-text-secondary' : 'text-text-primary')}>{rand(product.price)}</span>
        {!blocked && !soldOut && (
          <span className="w-9 h-9 rounded-full bg-accent-tint text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <Icon name="add" />
          </span>
        )}
      </span>
      {inCart > 0 && <span className="sr-only">{inCart} in sale</span>}
    </button>
  )
}

function PhotoManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, photos, setPhoto, removePhoto } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  async function upload(p: Product, file?: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Please choose an image file.', 'error')
    if (file.size > 15_000_000) return toast('That photo is too large. Choose one under 15 MB.', 'error')
    setBusy(p.id)
    try {
      const result = await setPhoto(p.id, await compressImage(file))
      toast(result.message, result.ok ? 'success' : 'error')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This photo could not be saved.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Product photos"
      description="Use your own photo for each product. Photos are resized and saved on this device only."
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
        {state.products
          .filter((p) => p.sellable)
          .map((p) => (
            <li key={p.id} className="p-space-sm rounded-xl border border-border-default flex items-center gap-space-sm">
              <ProductThumb product={p} className="w-16 h-16 rounded-lg" />
              <div className="min-w-0 flex-1 flex flex-col gap-space-xs">
                <span className="font-label-bold text-label-bold text-text-primary truncate">{p.name}</span>
                <div className="flex items-center gap-space-2xs">
                  <label
                    className={cx(
                      'min-h-10 px-space-sm rounded-lg bg-primary text-on-primary font-caption-medium text-caption-medium inline-flex items-center gap-space-2xs cursor-pointer hover:bg-accent-pressed focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary',
                      busy === p.id && 'opacity-70',
                    )}
                  >
                    <Icon
                      name={busy === p.id ? 'progress_activity' : 'upload'}
                      size="sm"
                      className={busy === p.id ? 'animate-spin' : undefined}
                    />
                    {photos[p.id] ? 'Replace' : 'Add photo'}
                    <input
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      aria-label={`Choose a photo for ${p.name}`}
                      onChange={(e) => {
                        upload(p, e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {photos[p.id] && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        removePhoto(p.id)
                        toast('Custom photo removed.', 'info')
                      }}
                      aria-label={`Remove photo for ${p.name}`}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
      </ul>
    </Modal>
  )
}

export default function Sales() {
  const { state, recordSale } = useStore()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryKey | 'all'>('all')
  const [cart, setCart] = useState<Line[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openRecipes, setOpenRecipes] = useState<Set<string>>(new Set())
  const [photosOpen, setPhotosOpen] = useState(false)

  const sellable = state.products.filter((p) => p.sellable)
  const cats = CATEGORIES.filter((c) => sellable.some((p) => p.category === c.key))
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sellable.filter(
      (p) => (category === 'all' || p.category === category) && (!q || `${p.name} ${p.detail}`.toLowerCase().includes(q)),
    )
  }, [sellable, query, category])

  const qtyOf = (id: string) => cart.find((l) => l.productId === id)?.qty ?? 0
  const total = cart.reduce((t, l) => t + l.qty * (productById(state, l.productId)?.price ?? 0), 0)
  const units = cart.reduce((t, l) => t + l.qty, 0)

  // Stock check for the whole cart (shared ingredients across items).
  const shortage = useMemo(() => {
    for (const [id, need] of deductionsFor(state, cart)) {
      const p = productById(state, id)!
      if (p.stock + 1e-9 < need) return `Not enough ${p.name} for this sale (${unitQty(p, p.stock)} left).`
    }
    return null
  }, [state, cart])

  function add(p: Product) {
    setCart((c) =>
      c.some((l) => l.productId === p.id)
        ? c.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { productId: p.id, qty: 1 }],
    )
    if (cart.length === 0) setDrawerOpen(true)
  }
  const change = (id: string, d: number) =>
    setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0))

  function confirm() {
    const result = recordSale(cart)
    toast(result.message, result.ok ? 'success' : 'error')
    if (result.ok) {
      setCart([])
      setDrawerOpen(false)
    }
  }

  return (
    <div className="w-full lg:pr-96">
      <div className="lg:max-w-5xl lg:mx-auto lg:px-space-lg lg:py-space-lg">
        {/* Search + filters (PRD 6.1: filters sit next to search) */}
        <div className="px-space-md pt-space-sm pb-space-sm bg-bg-surface shadow-sm lg:rounded-xl flex flex-col gap-space-sm">
          <SearchField value={query} onChange={setQuery} label="Search products" placeholder="Search item…" />
          <div
            className="flex items-center gap-space-xs overflow-x-auto no-scrollbar -mx-space-md px-space-md"
            role="group"
            aria-label="Filter by category"
          >
            <Chip selected={category === 'all'} onClick={() => setCategory('all')}>
              All
            </Chip>
            {cats.map((c) => (
              <Chip key={c.key} selected={category === c.key} onClick={() => setCategory(c.key)}>
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* Catalogue */}
        <div className="px-space-md lg:px-0 pt-space-md pb-56 lg:pb-space-lg">
          <div className="flex items-center justify-between pb-space-sm">
            <h1 className="font-label-bold text-label-bold text-text-primary">Quick-tap catalogue</h1>
            <Button variant="secondary" size="sm" icon="add_photo_alternate" onClick={() => setPhotosOpen(true)}>
              Product photos
            </Button>
          </div>
          {shown.length === 0 ? (
            <div className="bg-bg-surface rounded-xl shadow-sm">
              <EmptyState
                icon="search_off"
                title="No products match"
                body="Try another name or category."
                action={
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQuery('')
                      setCategory('all')
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-space-sm md:grid-cols-3 xl:grid-cols-4">
              {shown.map((p) => (
                <ProductTile key={p.id} product={p} inCart={qtyOf(p.id)} onAdd={() => add(p)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart: bottom drawer on mobile, right panel on desktop */}
      <aside
        aria-label="Current sale"
        className="fixed inset-x-0 bottom-app-nav z-40 bg-bg-surface rounded-t-2xl shadow-bar-up flex flex-col lg:left-auto lg:top-0 lg:bottom-0 lg:w-96 lg:rounded-none lg:border-l lg:border-border-default lg:shadow-none"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen((o) => !o)}
          aria-expanded={drawerOpen}
          aria-controls="cart-items"
          className="w-full pt-space-xs pb-space-sm px-space-md flex flex-col items-center rounded-t-2xl lg:pt-space-lg lg:cursor-default"
        >
          <span className="w-10 h-1 bg-border-disabled rounded-full mb-space-xs lg:hidden" />
          <span className="w-full flex items-center justify-between">
            <span className="flex items-center gap-space-xs">
              <span className="font-label-bold text-label-bold text-text-primary">Current sale</span>
              <span className="px-2 py-0.5 rounded-full bg-accent-tint text-primary font-caption-medium text-caption-medium">
                {units} {units === 1 ? 'item' : 'items'}
              </span>
            </span>
            <span className="flex items-center gap-space-2xs text-text-secondary lg:hidden">
              <span className="font-caption text-caption">{drawerOpen ? 'Hide' : 'Show'}</span>
              <Icon name="keyboard_arrow_up" className={cx('transition-transform', drawerOpen && 'rotate-180')} />
            </span>
          </span>
        </button>

        <div
          id="cart-items"
          className={cx(
            'overflow-y-auto px-space-md pb-space-sm flex-col gap-space-sm max-h-72 lg:max-h-none lg:flex-1',
            drawerOpen ? 'flex' : 'hidden lg:flex',
          )}
        >
          {cart.length === 0 ? (
            <EmptyState icon="shopping_basket" title="No items yet" body="Tap a product to add it to this sale." />
          ) : (
            cart.map((l) => {
              const p = productById(state, l.productId)!
              const open = openRecipes.has(p.id)
              return (
                <div key={p.id} className="p-space-sm bg-surface-container-low rounded-xl flex flex-col gap-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-label-bold text-label-bold text-text-primary truncate">{p.name}</p>
                      <p className="font-caption text-caption text-text-secondary">{rand(p.price)} each</p>
                    </div>
                    <div className="flex items-center bg-bg-surface rounded-lg shadow-sm">
                      <button
                        type="button"
                        onClick={() => change(p.id, -1)}
                        aria-label={`Remove one ${p.name}`}
                        className="w-tap h-tap flex items-center justify-center text-text-primary hover:bg-surface-container rounded-l-lg"
                      >
                        <Icon name={l.qty === 1 ? 'delete' : 'remove'} />
                      </button>
                      <span className="w-8 text-center font-label-bold text-label-bold text-text-primary" aria-live="polite">
                        {l.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => add(p)}
                        disabled={available(state, p) - l.qty <= 0}
                        aria-label={`Add one ${p.name}`}
                        className="w-tap h-tap flex items-center justify-center text-text-primary hover:bg-surface-container rounded-r-lg disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Icon name="add" />
                      </button>
                    </div>
                    <span className="w-20 text-right font-label-bold text-label-bold text-text-primary">{rand(p.price * l.qty)}</span>
                  </div>
                  {p.composite && p.recipe && (
                    <div className="p-space-xs bg-bg-surface rounded-lg">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenRecipes((s) => {
                            const n = new Set(s)
                            n.has(p.id) ? n.delete(p.id) : n.add(p.id)
                            return n
                          })
                        }
                        aria-expanded={open}
                        className="w-full min-h-10 flex items-center justify-between text-left text-primary"
                      >
                        <span className="flex items-center gap-space-2xs font-caption-medium text-caption-medium">
                          <Icon name="inventory" size="sm" />
                          Ingredient deductions
                        </span>
                        <Icon
                          name="expand_more"
                          size="sm"
                          className={cx('text-text-secondary transition-transform', open && 'rotate-180')}
                        />
                      </button>
                      {open && (
                        <ul className="pt-space-2xs pl-space-2xs flex flex-col gap-0.5 font-caption text-caption text-text-secondary">
                          {p.recipe.map((r) => {
                            const c = productById(state, r.productId)!
                            return (
                              <li key={r.productId} className="flex justify-between gap-space-xs">
                                <span>{c.name}</span>
                                <span className="font-caption-medium text-caption-medium text-text-primary">
                                  −{unitQty(c, r.qty * l.qty)}
                                </span>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="p-space-md border-t border-border-default flex flex-col gap-space-xs">
          {shortage && (
            <p
              role="alert"
              className="p-space-xs rounded-lg bg-error-tint text-error-default font-caption-medium text-caption-medium flex items-center gap-space-xs"
            >
              <Icon name="error" size="sm" />
              {shortage}
            </p>
          )}
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-space-xs">
              <span className="font-caption text-caption text-text-secondary">Total</span>
              <span className="px-1.5 py-0.5 rounded bg-success-tint text-secondary font-caption-medium text-caption-medium">
                Cash sale
              </span>
            </span>
            <span className="font-h1 text-h1 text-text-primary">{rand(total)}</span>
          </div>
          <Button block variant="primary" icon="payments" onClick={confirm} disabled={cart.length === 0 || !!shortage}>
            {cart.length === 0 ? 'Add items to sell' : `Confirm sale · ${rand(total)}`}
          </Button>
        </div>
      </aside>

      <PhotoManager open={photosOpen} onClose={() => setPhotosOpen(false)} />
    </div>
  )
}
