import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import BottomSheet from '../../components/ui/BottomSheet'
import FilledInput from '../../components/ui/FilledInput'
import ListRow from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { stockItems } from '../../data/inventory'
import type { Product } from '../../data/types'
import { colors, DURATION, fonts, money, radius, space, type } from '../../theme/tokens'
import { perUnit, toUnitPrice } from './pricesModel'

/** What the sheet opens with: nothing (pick an item), an item, or an existing price to change. */
export type PriceEdit = { productId?: string; supplier?: string; unitPrice?: number }

const parse = (t: string) => {
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Add a price, or change one. Pick the item (unless it came with one), the
 * supplier (an existing one, or type a new name), and the price — per unit or
 * per pack, whichever the supplier quoted.
 */
export default function AddPriceSheet({
  edit,
  onSaved,
  onClose,
}: {
  edit: PriceEdit | null
  onSaved: (message: string) => void
  onClose: () => void
}) {
  return (
    <BottomSheet visible={!!edit} onClose={onClose} handleOnly>
      {(finish) =>
        edit ? (
          <Body
            edit={edit}
            onSaved={(m) => {
              onSaved(m)
              finish()
            }}
          />
        ) : null
      }
    </BottomSheet>
  )
}

function Body({ edit, onSaved }: { edit: PriceEdit; onSaved: (message: string) => void }) {
  const store = useStore()
  const [productId, setProductId] = useState(edit.productId ?? null)
  const product = productId ? store.state.products.find((p) => p.id === productId) : undefined

  if (!product) {
    return (
      <PickItem
        onPick={(p) => {
          Haptics.selectionAsync()
          setProductId(p.id)
        }}
      />
    )
  }
  return (
    <PriceForm
      product={product}
      edit={edit}
      // Only offer to change the item if the sheet didn't open on one
      onChangeItem={edit.productId ? undefined : () => setProductId(null)}
      onSaved={onSaved}
    />
  )
}

function PickItem({ onPick }: { onPick: (p: Product) => void }) {
  const store = useStore()
  const [q, setQ] = useState('')
  const items = useMemo(
    () =>
      stockItems(store.state)
        .filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [store.state, q],
  )

  return (
    <View style={styles.body}>
      <Text style={styles.heading} accessibilityRole="header">
        Add a buying price
      </Text>
      <FilledInput label="Which item?" value={q} onChangeText={setQ} autoCorrect={false} />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {items.map((p, i) => (
          <ListRow key={p.id} title={p.name} detail={p.detail} onPress={() => onPick(p)} last={i === items.length - 1} />
        ))}
        {items.length === 0 ? <Text style={styles.hint}>{`No item called "${q.trim()}".`}</Text> : null}
      </ScrollView>
    </View>
  )
}

function PriceForm({
  product,
  edit,
  onChangeItem,
  onSaved,
}: {
  product: Product
  edit: PriceEdit
  onChangeItem?: () => void
  onSaved: (message: string) => void
}) {
  const store = useStore()
  const suppliers = useMemo(
    () => [...store.state.suppliers].sort((a, b) => a.name.localeCompare(b.name)),
    [store.state.suppliers],
  )
  const hasPack = product.packSize > 1

  const [supplier, setSupplier] = useState(edit.supplier ?? '')
  const [per, setPer] = useState<'unit' | 'pack'>('unit')
  const [amount, setAmount] = useState(edit.unitPrice != null ? String(edit.unitPrice) : '')

  const unitPrice = toUnitPrice(parse(amount), per, product.packSize)
  const canSave = supplier.trim().length > 0 && unitPrice > 0

  const save = () => {
    store.upsertSupplierPrice({ productId: product.id, supplierName: supplier.trim(), unitPrice })
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    onSaved(`${product.name}: ${money(unitPrice)} ${perUnit(product)} at ${supplier.trim()}`)
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <View style={styles.itemRow}>
        <View style={styles.flex}>
          <Text style={styles.heading} accessibilityRole="header" numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.hint}>{edit.supplier ? 'Change what you pay' : 'What do you pay for it?'}</Text>
        </View>
        {onChangeItem ? (
          <PressableScale onPress={onChangeItem} accessibilityLabel="Choose a different item" style={styles.change}>
            <Text style={styles.changeText}>Change</Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where you buy it</Text>
        {suppliers.length ? (
          <View style={styles.chips}>
            {suppliers.map((s) => {
              const on = s.name.toLowerCase() === supplier.trim().toLowerCase()
              return (
                <PressableScale
                  key={s.id}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setSupplier(s.name)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={s.name}
                  style={[styles.chip, on && styles.chipOn]}
                  hitSlop={4}
                >
                  <Text style={styles.chipText} numberOfLines={1}>
                    {s.name}
                  </Text>
                </PressableScale>
              )
            })}
          </View>
        ) : null}
        <FilledInput label="Or type a new supplier" value={supplier} onChangeText={setSupplier} autoCapitalize="words" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What you pay</Text>
        {hasPack ? (
          <View style={styles.toggle} accessibilityRole="radiogroup">
            {(['unit', 'pack'] as const).map((k) => {
              const on = k === per
              return (
                <PressableScale
                  key={k}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setPer(k)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  containerStyle={styles.flex}
                  style={[styles.toggleSeg, on && styles.toggleSegOn]}
                  hitSlop={0}
                >
                  <Text style={[styles.toggleText, on && styles.toggleTextOn]} numberOfLines={1}>
                    {k === 'unit' ? `Per ${product.unit}` : `Per ${product.packLabel}`}
                  </Text>
                </PressableScale>
              )
            })}
          </View>
        ) : null}
        <FilledInput
          label={per === 'unit' ? `Price ${perUnit(product)}` : `Price per ${product.packLabel}`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          hint={per === 'pack' && unitPrice > 0 ? `That's ${money(unitPrice)} ${perUnit(product)}` : undefined}
        />
      </View>

      <PrimaryButton label="Save price" onPress={save} disabled={!canSave} />
    </ScrollView>
  )
}

/**
 * Colour transitions for styles that go into PressableScale. `transform` has to
 * stay in the list: a transitionProperty here replaces PressableScale's own,
 * and without it the press scale would snap.
 */
const colourChange = {
  transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
  transitionDuration: [`${DURATION.press}ms`, `${DURATION.base}ms`, `${DURATION.base}ms`],
  transitionTimingFunction: ['ease-out', 'ease', 'ease'],
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 0 },
  body: { gap: space.lg, paddingBottom: space.sm },
  heading: { ...type.titleSm, color: colors.ink },
  hint: { ...type.caption, color: colors.quiet },
  list: { maxHeight: 360 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  change: { height: 36, paddingHorizontal: space.lg, borderRadius: radius.pill, backgroundColor: colors.field, justifyContent: 'center' },
  changeText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  section: { gap: space.sm },
  sectionTitle: { ...type.bodyStrong, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 38,
    maxWidth: '100%',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#E6E6E1',
    justifyContent: 'center',
    ...colourChange,
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  toggle: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radius.pill, backgroundColor: colors.field },
  toggleSeg: {
    height: 40,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    backgroundColor: 'rgba(17,17,17,0)',
    ...colourChange,
  },
  toggleSegOn: { backgroundColor: colors.ink },
  toggleText: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet },
  toggleTextOn: { color: colors.surface },
})
