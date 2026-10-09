import { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, Path } from 'react-native-svg'
import {
  CATEGORIES,
  available,
  healthOf,
  pricesFor,
  productById,
  rand,
  relativeTime,
  stockItems,
  supplierName,
  unitQty,
  type CategoryKey,
  type Product,
  type SupplierPrice,
} from '../core'
import { useNav } from '../nav'
import { useStore } from '../store'
import { useToast } from '../toast'
import { Button, Card, Chip, EmptyState, Field, HScroll, Icon, Pill, ProductThumb, Radio, Select, Sheet, StatusBadge, TextField, s } from '../ui'
import { colors, radius, space, type } from '../theme'

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

function PriceSheet({ product, open, onClose, initial }: { product: Product; open: boolean; onClose: () => void; initial?: SupplierPrice }) {
  const { state, upsertSupplierPrice } = useStore()
  const toast = useToast()
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
            location: state.suppliers.find((x) => x.id === initial.supplierId)?.location ?? '',
            packPrice: (initial.unitPrice * product.packSize).toFixed(2),
            unitsPerPack: String(product.packSize),
            minOrder: initial.minOrder ? String(initial.minOrder) : '',
          }
        : blank,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial, product.id])

  const num = (v: string) => parseFloat(v.replace(',', '.'))
  const pack = num(d.packPrice)
  const per = num(d.unitsPerPack)
  const min = d.minOrder ? num(d.minOrder) : undefined
  const errors = {
    supplierName: !d.supplierName.trim() ? 'Enter the supplier name.' : undefined,
    packPrice: !(pack > 0) ? 'Enter a price above R0.' : undefined,
    unitsPerPack: !(per > 0) ? 'Enter how many units are in the pack.' : undefined,
    minOrder: min !== undefined && !(min > 0) ? 'Leave empty or enter a number above 0.' : undefined,
  }
  const valid = !Object.values(errors).some(Boolean)
  const unitPrice = valid ? Math.round((pack / per) * 100) / 100 : null
  const q = d.supplierName.trim().toLowerCase()
  const suggestions = initial ? [] : state.suppliers.filter((x) => x.name.toLowerCase() !== q && (!q || x.name.toLowerCase().includes(q)))

  function save() {
    setTried(true)
    if (!valid || unitPrice === null) return
    upsertSupplierPrice({ productId: product.id, supplierName: d.supplierName, unitPrice, minOrder: min, location: d.location })
    toast(`Saved ${rand(unitPrice)} per ${product.unit} from ${d.supplierName.trim()}.`)
    onClose()
  }

  const set = (k: keyof Draft) => (v: string) => setD((cur) => ({ ...cur, [k]: v }))

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={initial ? 'Update supplier price' : 'Add supplier price'}
      description={`${product.name} · prices are saved on this device and synced when online.`}
      footer={
        <>
          <Button icon="check" onPress={save} block>
            Save price
          </Button>
          <Button variant="ghost" onPress={onClose} block>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Supplier name" error={tried ? errors.supplierName : undefined}>
        <TextField
          value={d.supplierName}
          onChangeText={set('supplierName')}
          placeholder="e.g. Jumbo Cash & Carry"
          editable={!initial}
          autoCorrect={false}
          accessibilityLabel="Supplier name"
          invalid={tried && !!errors.supplierName}
        />
      </Field>
      {suggestions.length > 0 && (
        <HScroll inset={0}>
          {suggestions.map((x) => (
            <Chip key={x.id} selected={false} onPress={() => set('supplierName')(x.name)}>
              {x.name}
            </Chip>
          ))}
        </HScroll>
      )}
      {!initial && (
        <Field label="Location (optional)">
          <TextField value={d.location} onChangeText={set('location')} placeholder="e.g. Crown Mines" accessibilityLabel="Location (optional)" />
        </Field>
      )}
      <View style={[s.row, { gap: space.sm, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Pack price (R)" error={tried ? errors.packPrice : undefined}>
            <TextField value={d.packPrice} onChangeText={set('packPrice')} placeholder="132.00" keyboardType="decimal-pad" accessibilityLabel="Pack price in rand" invalid={tried && !!errors.packPrice} />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label={`${product.unitPlural} per pack`} error={tried ? errors.unitsPerPack : undefined}>
            <TextField value={d.unitsPerPack} onChangeText={set('unitsPerPack')} keyboardType="decimal-pad" accessibilityLabel={`${product.unitPlural} per pack`} invalid={tried && !!errors.unitsPerPack} />
          </Field>
        </View>
      </View>
      <Field label={`Minimum order (${product.unitPlural}, optional)`} error={tried ? errors.minOrder : undefined}>
        <TextField value={d.minOrder} onChangeText={set('minOrder')} keyboardType="decimal-pad" accessibilityLabel="Minimum order, optional" invalid={tried && !!errors.minOrder} />
      </Field>
      <View style={styles.calc} accessibilityLiveRegion="polite">
        <Icon name="calculate" color={colors.primary} />
        <Text style={[type.label, { color: colors.primary, flex: 1 }]}>
          {unitPrice !== null ? `${rand(unitPrice)} per ${product.unit}` : 'Enter the pack price to see the unit price'}
        </Text>
      </View>
    </Sheet>
  )
}

function ProductSheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (product: Product) => void }) {
  const { state, addProduct } = useStore()
  const toast = useToast()
  const [draft, setDraft] = useState<ProductDraft>(BLANK_PRODUCT)
  const [tried, setTried] = useState(false)

  useEffect(() => {
    if (!open) return
    setDraft(BLANK_PRODUCT)
    setTried(false)
  }, [open])

  const num = (value: string) => parseFloat(value.replace(',', '.'))
  const price = num(draft.price)
  const stock = num(draft.stock)
  const packSize = num(draft.packSize)
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
  const set = (key: keyof ProductDraft) => (value: string) => setDraft((current) => ({ ...current, [key]: value }))

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
    <Sheet
      open={open}
      onClose={onClose}
      title="Add individual product"
      description="Create a product you buy, stock, and sell as an individual item."
      footer={
        <>
          <Button icon="add" onPress={save} block>
            Add product
          </Button>
          <Button variant="ghost" onPress={onClose} block>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Product name" error={tried ? errors.name : undefined}>
        <TextField
          value={draft.name}
          onChangeText={set('name')}
          placeholder="e.g. Orange Juice 1L"
          accessibilityLabel="Product name"
          invalid={tried && !!errors.name}
        />
      </Field>
      <Field label="Description (optional)">
        <TextField
          value={draft.detail}
          onChangeText={set('detail')}
          placeholder="e.g. 100% fruit juice"
          accessibilityLabel="Product description, optional"
        />
      </Field>
      <Field label="Category">
        <Select
          label="Product category"
          value={draft.category}
          onChange={(category) => setDraft((current) => ({ ...current, category }))}
          options={CATEGORIES.map((category) => ({ key: category.key, label: category.label }))}
        />
      </Field>
      <View style={[s.row, { gap: space.sm, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Selling price (R)" error={tried ? errors.price : undefined}>
            <TextField
              value={draft.price}
              onChangeText={set('price')}
              placeholder="0.00"
              keyboardType="decimal-pad"
              accessibilityLabel="Selling price in rand"
              invalid={tried && !!errors.price}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Current stock" error={tried ? errors.stock : undefined}>
            <TextField
              value={draft.stock}
              onChangeText={set('stock')}
              keyboardType="decimal-pad"
              accessibilityLabel="Current stock"
              invalid={tried && !!errors.stock}
            />
          </Field>
        </View>
      </View>
      <View style={[s.row, { gap: space.sm, alignItems: 'flex-start' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Unit name" error={tried ? errors.unit : undefined} hint="What one item is called.">
            <TextField
              value={draft.unit}
              onChangeText={set('unit')}
              placeholder="bottle"
              accessibilityLabel="Unit name"
              invalid={tried && !!errors.unit}
            />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Plural unit" error={tried ? errors.unitPlural : undefined}>
            <TextField
              value={draft.unitPlural}
              onChangeText={set('unitPlural')}
              placeholder="bottles"
              accessibilityLabel="Plural unit name"
              invalid={tried && !!errors.unitPlural}
            />
          </Field>
        </View>
      </View>
      <Field label="Units in a supplier pack" error={tried ? errors.packSize : undefined} hint="Use 1 if suppliers sell this item individually.">
        <TextField
          value={draft.packSize}
          onChangeText={set('packSize')}
          keyboardType="decimal-pad"
          accessibilityLabel="Units in a supplier pack"
          invalid={tried && !!errors.packSize}
        />
      </Field>
    </Sheet>
  )
}

function Sparkline({ points, label }: { points: { at: number; price: number }[]; label: string }) {
  const [w, setW] = useState(300)
  if (points.length < 2) return <Text style={[type.caption, { color: colors.textSecondary }]}>Not enough history yet. Update the price over time to see a trend.</Text>
  const min = Math.min(...points.map((p) => p.price))
  const max = Math.max(...points.map((p) => p.price))
  const span = max - min || 1
  const H = 48
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, H - 6 - ((p.price - min) / span) * (H - 14)] as const)
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityRole="image" accessibilityLabel={label}>
      <Svg width={w} height={H}>
        <Path d={`${d} L${w},${H} L0,${H} Z`} fill={colors.accentTint} />
        <Path d={d} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={last[0]} cy={last[1]} r={3.5} fill={colors.brandPurple} />
      </Svg>
    </View>
  )
}

export default function Supply() {
  const { state, setPreferredSupplier } = useStore()
  const toast = useToast()
  const { route, navigate } = useNav()
  const items = stockItems(state)
  const itemParam = route.name === 'supply' ? route.item : undefined
  const product = productById(state, itemParam ?? '') ?? items.find((p) => healthOf(state, p) !== 'healthy') ?? items[0]
  const prices = useMemo(() => pricesFor(state, product.id), [state, product.id])
  const [selected, setSelected] = useState(state.preferred[product.id] ?? prices[0]?.supplierId)
  const [modal, setModal] = useState<{ open: boolean; edit?: SupplierPrice }>({ open: false })
  const [productSheetOpen, setProductSheetOpen] = useState(false)

  useEffect(() => setSelected(state.preferred[product.id] ?? pricesFor(state, product.id)[0]?.supplierId), [product.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const cheapest = prices[0]
  const dearest = prices[prices.length - 1]
  const chosen = prices.find((p) => p.supplierId === selected)
  const applied = selected === state.preferred[product.id]

  return (
    <ScrollView contentContainerStyle={{ padding: space.md, gap: space.md, paddingBottom: space.xl }}>
      {/* Item selector */}
      <Card style={{ padding: space.md, gap: space.sm }}>
        <View style={s.rowBetween}>
          <Text style={[type.captionMedium, styles.overline]}>Item to compare</Text>
          <Button variant="ghost" size="sm" icon="add" onPress={() => setProductSheetOpen(true)}>
            Add product
          </Button>
        </View>
        <View style={[s.row, { gap: space.sm }]}>
          <ProductThumb product={product} />
          <View style={{ flex: 1 }}>
            <Select
              label="Item to compare"
              value={product.id}
              onChange={(id) => navigate({ name: 'supply', item: id }, { replace: true })}
              options={items.map((p) => ({ key: p.id, label: p.name, sub: `${unitQty(p, available(state, p))} on hand` }))}
            />
          </View>
        </View>
        <View style={[s.row, { flexWrap: 'wrap', gap: space.xs }]}>
          <StatusBadge health={healthOf(state, product)} />
          <Text style={[type.caption, { color: colors.textSecondary }]}>
            {unitQty(product, available(state, product))} on hand · sold by the {product.packLabel}
          </Text>
        </View>
        {cheapest && (
          <View style={[s.row, { gap: space.xs }]}>
            <View style={styles.kpi}>
              <Icon name="trending_down" color={colors.bestValue} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  Lowest unit price
                </Text>
                <Text style={[type.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
                  {rand(cheapest.unitPrice)} <Text style={[type.caption, { color: colors.textSecondary }]}>/ {product.unit}</Text>
                </Text>
              </View>
            </View>
            <View style={styles.kpi}>
              <Icon name="savings" color={colors.brandPurple} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  Saving vs. dearest
                </Text>
                <Text style={[type.labelBold, { color: colors.secondary }]} numberOfLines={1}>
                  {rand((dearest.unitPrice - cheapest.unitPrice) * product.packSize)}{' '}
                  <Text style={[type.caption, { color: colors.textSecondary }]}>/ {product.packLabel}</Text>
                </Text>
              </View>
            </View>
          </View>
        )}
      </Card>

      {/* Quotes */}
      <View style={[s.rowBetween, { paddingHorizontal: space['2xs'] }]}>
        <View style={[s.row, { gap: space.xs }]}>
          <Text style={[type.labelBold, { color: colors.textPrimary }]} accessibilityRole="header">
            Saved supplier prices
          </Text>
          <Pill>{prices.length}</Pill>
        </View>
        <Text style={[type.caption, { color: colors.textSecondary }]}>Cheapest first</Text>
      </View>

      {prices.length === 0 ? (
        <Card>
          <EmptyState icon="storefront" title="No prices saved for this item" body="Add a quote or invoice price to compare suppliers." />
        </Card>
      ) : (
        <View style={{ gap: space.sm }} accessibilityRole="radiogroup" accessibilityLabel={`Choose a supplier for ${product.name}`}>
          {prices.map((p, i) => {
            const isCheapest = i === 0
            const delta = p.unitPrice - cheapest.unitPrice
            const stale = Date.now() - p.updatedAt > STALE_DAYS * 86_400_000
            const supplier = state.suppliers.find((x) => x.id === p.supplierId)
            const isSel = selected === p.supplierId
            return (
              <View key={p.id} style={[s.card, styles.quote, { borderColor: isSel ? colors.primary : 'transparent' }]}>
                <Pressable
                  onPress={() => setSelected(p.supplierId)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: isSel }}
                  accessibilityLabel={`${supplier?.name}, ${rand(p.unitPrice)} per ${product.unit}${isCheapest ? ', cheapest' : ''}`}
                  style={[s.row, { alignItems: 'flex-start', gap: space.sm }]}
                >
                  <View style={{ paddingTop: 2 }}>
                    <Radio checked={isSel} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: space['2xs'] }}>
                    <View style={[s.row, { flexWrap: 'wrap', gap: space.xs }]}>
                      {isCheapest ? (
                        <View style={[s.pill, { backgroundColor: colors.bestValue, borderRadius: 4 }]}>
                          <Icon name="verified" size="xs" color={colors.onSecondary} />
                          <Text style={[s.solidText, { color: colors.onSecondary }]}>CHEAPEST</Text>
                        </View>
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
                      <View style={[s.row, { gap: 2 }]}>
                        <Icon name={stale ? 'history' : 'schedule'} size="xs" color={stale ? colors.tertiary : colors.textSecondary} />
                        <Text style={[type.caption, { color: stale ? colors.tertiary : colors.textSecondary }]}>Updated {relativeTime(p.updatedAt)}</Text>
                      </View>
                    </View>
                    <View style={[s.rowBetween, { alignItems: 'flex-end', gap: space.sm }]}>
                      <Text style={[type.labelBold, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
                        {supplier?.name}
                      </Text>
                      <Text style={[type.h1, { color: colors.textPrimary }]}>
                        {rand(p.unitPrice)}
                        <Text style={[type.caption, { color: colors.textSecondary }]}> / {product.unit}</Text>
                      </Text>
                    </View>
                    <View style={[s.rowBetween, { flexWrap: 'wrap', gap: space.xs }]}>
                      <Text style={[type.caption, { color: colors.textSecondary }]}>
                        {product.packLabel}: <Text style={[type.captionMedium, { color: colors.textPrimary }]}>{rand(p.unitPrice * product.packSize)}</Text>
                        {!isCheapest && ` (+${rand(delta * product.packSize)})`}
                      </Text>
                      <View style={[s.row, { gap: space.sm }]}>
                        {supplier?.location && (
                          <View style={[s.row, { gap: 2 }]}>
                            <Icon name="location_on" size="xs" color={colors.textSecondary} />
                            <Text style={[type.caption, { color: colors.textSecondary }]}>{supplier.location}</Text>
                          </View>
                        )}
                        {p.minOrder ? <Text style={[type.caption, { color: colors.textSecondary }]}>Min. {unitQty(product, p.minOrder)}</Text> : null}
                      </View>
                    </View>
                  </View>
                </Pressable>
                <View style={{ alignItems: 'flex-end', paddingTop: space.xs }}>
                  <Button variant="ghost" size="sm" icon="edit" onPress={() => setModal({ open: true, edit: p })} accessibilityLabel={`Update ${supplier?.name} price`}>
                    Update price
                  </Button>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Dashed outline is reserved for this add placeholder */}
      <Pressable onPress={() => setModal({ open: true })} accessibilityRole="button" style={({ pressed }) => [styles.addBox, pressed && { borderColor: colors.primary, backgroundColor: colors.bgSurface }]}>
        <View style={styles.addIcon}>
          <Icon name="add" size="lg" color={colors.primary} />
        </View>
        <Text style={[type.labelBold, { color: colors.textPrimary }]}>Add supplier price</Text>
        <Text style={[type.caption, { color: colors.textSecondary }]}>Log a quote or invoice price from a supplier</Text>
      </Pressable>

      {chosen && (
        <Card style={{ padding: space.md, gap: space.xs }}>
          <View style={[s.rowBetween, { gap: space.sm }]}>
            <Text style={[type.labelBold, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>
              Price history · {supplierName(state, chosen.supplierId)}
            </Text>
            {chosen.history.length > 1 &&
              (() => {
                const first = chosen.history[0].price
                const change = ((chosen.unitPrice - first) / first) * 100
                const tone = change <= 0 ? colors.secondary : colors.errorDefault
                return (
                  <View style={[s.row, { gap: 2 }]}>
                    <Icon name={change <= 0 ? 'south_east' : 'north_east'} size="sm" color={tone} />
                    <Text style={[type.captionMedium, { color: tone }]}>
                      {change > 0 ? '+' : ''}
                      {change.toFixed(1)}%
                    </Text>
                  </View>
                )
              })()}
          </View>
          <Sparkline points={chosen.history} label={`Price history: ${chosen.history.map((h) => rand(h.price)).join(', ')}`} />
          {chosen.history.length > 1 && (
            <View style={s.rowBetween}>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {relativeTime(chosen.history[0].at)}: {rand(chosen.history[0].price)}
              </Text>
              <Text style={[type.caption, { color: colors.textSecondary }]}>Now: {rand(chosen.unitPrice)}</Text>
            </View>
          )}
        </Card>
      )}

      {chosen && (
        <Button
          block
          variant={applied ? 'success' : 'primary'}
          icon={applied ? 'check' : 'playlist_add_check'}
          disabled={applied}
          onPress={() => {
            setPreferredSupplier(product.id, chosen.supplierId)
            toast(`${supplierName(state, chosen.supplierId)} will be used for ${product.name} in your restock plan.`)
          }}
        >
          {applied ? `Using ${supplierName(state, chosen.supplierId)} in restock plan` : `Use ${supplierName(state, chosen.supplierId)} in restock plan`}
        </Button>
      )}

      <PriceSheet product={product} open={modal.open} initial={modal.edit} onClose={() => setModal({ open: false })} />
      <ProductSheet
        open={productSheetOpen}
        onClose={() => setProductSheetOpen(false)}
        onCreated={(created) => {
          setProductSheetOpen(false)
          navigate({ name: 'supply', item: created.id }, { replace: true })
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  overline: { color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },
  kpi: { flex: 1, borderRadius: radius.lg, backgroundColor: colors.surfaceContainerLow, padding: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  quote: { padding: space.md, borderWidth: 2 },
  addBox: {
    minHeight: 96,
    padding: space.md,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderDisabled,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['2xs'],
  },
  addIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  calc: { padding: space.sm, borderRadius: radius.lg, backgroundColor: colors.accentTint, flexDirection: 'row', alignItems: 'center', gap: space.xs },
})
