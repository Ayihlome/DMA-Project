import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native'
import { CATEGORIES, available, categoryLabel, deductionsFor, healthOf, productById, rand, unitQty, type CategoryKey, type Product } from '../core'
import { pickProductPhoto } from '../lib/photo'
import { useStore } from '../store'
import { useToast } from '../toast'
import { Button, Chip, EmptyState, HScroll, Icon, ProductThumb, SearchField, Sheet, Stepper, s } from '../ui'
import { colors, radius, shadow, space, type } from '../theme'

type Line = { productId: string; qty: number }

function ProductTile({ product, inCart, onAdd, width }: { product: Product; inCart: number; onAdd: () => void; width: number }) {
  const { state } = useStore()
  const health = healthOf(state, product)
  const left = available(state, product) - inCart
  const blocked = health === 'setup'
  const soldOut = !blocked && left <= 0
  const [bg, fg] = soldOut
    ? [colors.errorDefault, colors.onError]
    : health === 'healthy'
      ? [colors.secondary, colors.onSecondary]
      : health === 'low'
        ? [colors.warningDefault, colors.onPrimary]
        : [colors.errorDefault, colors.onError]

  return (
    <Pressable
      onPress={onAdd}
      disabled={blocked || soldOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: blocked || soldOut }}
      accessibilityLabel={`Add ${product.name}, ${rand(product.price)}${blocked ? ', unavailable: recipe missing' : soldOut ? ', none left' : `, ${left} left`}${inCart ? `, ${inCart} in sale` : ''}`}
      style={({ pressed }) => [s.card, styles.tile, { width }, (blocked || soldOut) && { opacity: 0.8 }, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.tileImage}>
        <ProductThumb product={product} fill grayscale={blocked || soldOut} />
        {blocked ? (
          <View style={[StyleSheet.absoluteFill, s.center, { backgroundColor: 'rgba(208,218,240,0.5)' }]}>
            <Icon name="lock" size="xl" color={colors.errorDefault} />
          </View>
        ) : (
          <View style={[s.pill, styles.stockPill, { backgroundColor: bg }]}>
            {health !== 'healthy' && <Icon name={soldOut || health !== 'low' ? 'warning' : 'flag'} size="xs" color={fg} />}
            <Text style={[type.captionMedium, { color: fg }]}>{soldOut ? 'None left' : product.composite ? `${left} can be made` : `${left} left`}</Text>
          </View>
        )}
      </View>
      <Text style={[type.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
        {product.composite ? product.detail : `${categoryLabel(product.category)} · ${product.detail}`}
      </Text>
      {blocked && (
        <View style={styles.blocked}>
          <Icon name="warning" size="xs" color={colors.errorDefault} style={{ marginTop: 1 }} />
          <Text style={[type.caption, { color: colors.errorDefault, flex: 1 }]}>Recipe missing, so stock can't be deducted</Text>
        </View>
      )}
      <View style={[s.rowBetween, { marginTop: 'auto', paddingTop: space.xs }]}>
        <Text style={[type.h2, { color: blocked ? colors.textSecondary : colors.textPrimary }]}>{rand(product.price)}</Text>
        {!blocked && !soldOut && (
          <View style={styles.addDot}>
            <Icon name="add" color={colors.primary} />
          </View>
        )}
      </View>
      {inCart > 0 && (
        <View style={styles.inCart} accessible={false}>
          <Text style={[type.captionMedium, { color: colors.onPrimary }]}>{inCart}</Text>
        </View>
      )}
    </Pressable>
  )
}

function PhotoManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, photos, setPhoto, removePhoto } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  async function upload(p: Product) {
    setBusy(p.id)
    try {
      const dataUrl = await pickProductPhoto()
      if (!dataUrl) return
      const result = await setPhoto(p.id, dataUrl)
      toast(result.message, result.ok ? 'success' : 'error')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'This photo could not be saved.', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Product photos" description="Use your own photo for each product. Photos are resized and saved on this device only.">
      {state.products
        .filter((p) => p.sellable)
        .map((p) => (
          <View key={p.id} style={styles.photoRow}>
            <ProductThumb product={p} style={{ width: 64, height: 64, borderRadius: radius.lg }} />
            <View style={{ flex: 1, minWidth: 0, gap: space.xs }}>
              <Text style={[type.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={[s.row, { gap: space['2xs'] }]}>
                <Button size="sm" icon="upload" busy={busy === p.id} onPress={() => upload(p)} accessibilityLabel={`Choose a photo for ${p.name}`}>
                  {photos[p.id] ? 'Replace' : 'Add photo'}
                </Button>
                {photos[p.id] && (
                  <Button
                    size="sm"
                    variant="danger"
                    accessibilityLabel={`Remove photo for ${p.name}`}
                    onPress={() => {
                      removePhoto(p.id)
                      toast('Custom photo removed.', 'info')
                    }}
                  >
                    Remove
                  </Button>
                )}
              </View>
            </View>
          </View>
        ))}
    </Sheet>
  )
}

export default function Sales() {
  const { state, recordSale } = useStore()
  const toast = useToast()
  const { width } = useWindowDimensions()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryKey | 'all'>('all')
  const [cart, setCart] = useState<Line[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [openRecipes, setOpenRecipes] = useState<Set<string>>(new Set())
  const [photosOpen, setPhotosOpen] = useState(false)

  const cols = width >= 900 ? 4 : width >= 600 ? 3 : 2
  const tileW = (width - space.md * 2 - space.sm * (cols - 1)) / cols

  const sellable = state.products.filter((p) => p.sellable)
  const cats = CATEGORIES.filter((c) => sellable.some((p) => p.category === c.key))
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sellable.filter((p) => (category === 'all' || p.category === category) && (!q || `${p.name} ${p.detail}`.toLowerCase().includes(q)))
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
    setCart((c) => (c.some((l) => l.productId === p.id) ? c.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l)) : [...c, { productId: p.id, qty: 1 }]))
    if (cart.length === 0) setDrawerOpen(true)
  }
  const change = (id: string, d: number) => setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0))

  function confirm() {
    const result = recordSale(cart)
    toast(result.message, result.ok ? 'success' : 'error')
    if (result.ok) {
      setCart([])
      setDrawerOpen(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.filters}>
        <SearchField value={query} onChange={setQuery} label="Search products" placeholder="Search item…" />
        <HScroll>
          <Chip selected={category === 'all'} onPress={() => setCategory('all')}>
            All
          </Chip>
          {cats.map((c) => (
            <Chip key={c.key} selected={category === c.key} onPress={() => setCategory(c.key)}>
              {c.label}
            </Chip>
          ))}
        </HScroll>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: space.lg }} keyboardShouldPersistTaps="handled">
        <View style={[s.rowBetween, { paddingBottom: space.sm }]}>
          <Text style={[type.labelBold, { color: colors.textPrimary }]} accessibilityRole="header">
            Quick-tap catalogue
          </Text>
          <Button variant="secondary" size="sm" icon="add_photo_alternate" onPress={() => setPhotosOpen(true)}>
            Product photos
          </Button>
        </View>
        {shown.length === 0 ? (
          <View style={s.card}>
            <EmptyState
              icon="search_off"
              title="No products match"
              body="Try another name or category."
              action={
                <Button
                  variant="ghost"
                  onPress={() => {
                    setQuery('')
                    setCategory('all')
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          </View>
        ) : (
          <View style={styles.grid}>
            {shown.map((p) => (
              <ProductTile key={p.id} product={p} width={tileW} inCart={qtyOf(p.id)} onAdd={() => add(p)} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Cart drawer docked above the bottom navigation */}
      <View style={styles.drawer} accessibilityLabel="Current sale">
        <Pressable
          onPress={() => setDrawerOpen((o) => !o)}
          accessibilityRole="button"
          accessibilityState={{ expanded: drawerOpen }}
          accessibilityLabel={`Current sale, ${units} ${units === 1 ? 'item' : 'items'}. ${drawerOpen ? 'Hide' : 'Show'} items`}
          style={styles.drawerHead}
        >
          <View style={styles.grabber} />
          <View style={[s.rowBetween, { alignSelf: 'stretch' }]}>
            <View style={[s.row, { gap: space.xs }]}>
              <Text style={[type.labelBold, { color: colors.textPrimary }]}>Current sale</Text>
              <View style={[s.pill, { backgroundColor: colors.accentTint }]}>
                <Text style={[type.captionMedium, { color: colors.primary }]}>
                  {units} {units === 1 ? 'item' : 'items'}
                </Text>
              </View>
            </View>
            <View style={[s.row, { gap: space['2xs'] }]}>
              <Text style={[type.caption, { color: colors.textSecondary }]}>{drawerOpen ? 'Hide' : 'Show'}</Text>
              <Icon name={drawerOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} color={colors.textSecondary} />
            </View>
          </View>
        </Pressable>

        {drawerOpen && (
          <ScrollView style={{ maxHeight: 288 }} contentContainerStyle={{ paddingHorizontal: space.md, paddingBottom: space.sm, gap: space.sm }}>
            {cart.length === 0 ? (
              <EmptyState icon="shopping_basket" title="No items yet" body="Tap a product to add it to this sale." />
            ) : (
              cart.map((l) => {
                const p = productById(state, l.productId)!
                const open = openRecipes.has(p.id)
                return (
                  <View key={p.id} style={styles.line}>
                    <View style={[s.row, { gap: space.xs }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[type.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
                          {p.name}
                        </Text>
                        <Text style={[type.caption, { color: colors.textSecondary }]}>{rand(p.price)} each</Text>
                      </View>
                      <Stepper
                        value={String(l.qty)}
                        minusIcon={l.qty === 1 ? 'delete' : 'remove'}
                        onMinus={() => change(p.id, -1)}
                        onPlus={() => add(p)}
                        plusDisabled={available(state, p) - l.qty <= 0}
                        minusLabel={`Remove one ${p.name}`}
                        plusLabel={`Add one ${p.name}`}
                      />
                      <Text style={[type.labelBold, { color: colors.textPrimary, width: 72, textAlign: 'right' }]}>{rand(p.price * l.qty)}</Text>
                    </View>
                    {p.composite && p.recipe && (
                      <View style={styles.recipe}>
                        <Pressable
                          onPress={() =>
                            setOpenRecipes((cur) => {
                              const n = new Set(cur)
                              if (n.has(p.id)) n.delete(p.id)
                              else n.add(p.id)
                              return n
                            })
                          }
                          accessibilityRole="button"
                          accessibilityState={{ expanded: open }}
                          style={[s.rowBetween, { minHeight: 40 }]}
                        >
                          <View style={[s.row, { gap: space['2xs'] }]}>
                            <Icon name="inventory" size="sm" color={colors.primary} />
                            <Text style={[type.captionMedium, { color: colors.primary }]}>Ingredient deductions</Text>
                          </View>
                          <Icon name={open ? 'expand_less' : 'expand_more'} size="sm" color={colors.textSecondary} />
                        </Pressable>
                        {open &&
                          p.recipe.map((r) => {
                            const c = productById(state, r.productId)!
                            return (
                              <View key={r.productId} style={[s.rowBetween, { paddingLeft: space['2xs'], paddingTop: 2 }]}>
                                <Text style={[type.caption, { color: colors.textSecondary }]}>{c.name}</Text>
                                <Text style={[type.captionMedium, { color: colors.textPrimary }]}>−{unitQty(c, r.qty * l.qty)}</Text>
                              </View>
                            )
                          })}
                      </View>
                    )}
                  </View>
                )
              })
            )}
          </ScrollView>
        )}

        <View style={styles.drawerFoot}>
          {shortage && (
            <View style={styles.alert} accessibilityRole="alert" accessibilityLiveRegion="assertive">
              <Icon name="error" size="sm" color={colors.errorDefault} />
              <Text style={[type.captionMedium, { color: colors.errorDefault, flex: 1 }]}>{shortage}</Text>
            </View>
          )}
          <View style={[s.rowBetween, { alignItems: 'flex-end' }]}>
            <View style={[s.row, { gap: space.xs }]}>
              <Text style={[type.caption, { color: colors.textSecondary }]}>Total</Text>
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: colors.successTint }}>
                <Text style={[type.captionMedium, { color: colors.secondary }]}>Cash sale</Text>
              </View>
            </View>
            <Text style={[type.h1, { color: colors.textPrimary }]}>{rand(total)}</Text>
          </View>
          <Button block icon="payments" onPress={confirm} disabled={cart.length === 0 || !!shortage}>
            {cart.length === 0 ? 'Add items to sell' : `Confirm sale · ${rand(total)}`}
          </Button>
        </View>
      </View>

      <PhotoManager open={photosOpen} onClose={() => setPhotosOpen(false)} />
    </View>
  )
}

export function Loading() {
  return <ActivityIndicator color={colors.primary} />
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: space.md, paddingTop: space.sm, paddingBottom: space.sm, backgroundColor: colors.bgSurface, gap: space.sm, ...shadow.sm, zIndex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  tile: { padding: space.sm, minHeight: 230 },
  tileImage: { height: 96, width: '100%', borderRadius: radius.lg, overflow: 'hidden', marginBottom: space.xs },
  stockPill: { position: 'absolute', top: space['2xs'], right: space['2xs'] },
  blocked: { marginTop: space['2xs'], padding: space['2xs'], borderRadius: radius.sm, backgroundColor: colors.errorTint, flexDirection: 'row', gap: space['2xs'] },
  addDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  inCart: {
    position: 'absolute',
    top: space.xs,
    left: space.xs,
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRow: { padding: space.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.borderDefault, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  drawer: { backgroundColor: colors.bgSurface, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], ...shadow.barUp },
  drawerHead: { paddingTop: space.xs, paddingBottom: space.sm, paddingHorizontal: space.md, alignItems: 'center' },
  grabber: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderDisabled, marginBottom: space.xs },
  line: { padding: space.sm, borderRadius: radius.xl, backgroundColor: colors.surfaceContainerLow, gap: space.xs },
  recipe: { padding: space.xs, borderRadius: radius.lg, backgroundColor: colors.bgSurface },
  drawerFoot: { padding: space.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDefault, gap: space.xs },
  alert: { padding: space.xs, borderRadius: radius.lg, backgroundColor: colors.errorTint, flexDirection: 'row', alignItems: 'center', gap: space.xs },
})
