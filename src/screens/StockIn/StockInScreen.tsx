import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcon from '../../components/common/MaterialIcon'
import ActionToast, { type Toast } from '../../components/ui/ActionToast'
import FilledInput from '../../components/ui/FilledInput'
import { DIVIDER } from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import { useStore } from '../../store'
import { pricesFor, stockItems, unitQty } from '../../data/inventory'
import type { Product } from '../../data/types'
import { colors, DURATION, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { packText } from '../Restock/restockModel'

const SIDE = 28
const OPEN = FadeIn.duration(200)
const CLOSE = FadeOut.duration(160)
const REFLOW = LinearTransition.duration(200)

const parse = (t: string) => {
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** The pack word for prompts: "crate", "tray" — or the unit when bought singly. */
const packWord = (p: Product) => (p.packSize > 1 ? p.packLabel.split(/\s+/)[0]?.toLowerCase() || 'pack' : p.unit)

/**
 * Stock came in: record a delivery or a shopping trip — any item, any amount,
 * not just what Restock suggested. It's also the moment the price is in front
 * of the owner, so they can type what they paid and buying prices stay current
 * without a separate trip to the Prices tab.
 */
export default function StockInScreen() {
  const insets = useSafeAreaInsets()
  const store = useStore()

  const [supplierId, setSupplierId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [packs, setPacks] = useState<Record<string, number>>({})
  const [paid, setPaid] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<Toast | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const suppliers = useMemo(() => [...store.state.suppliers].sort((a, b) => a.name.localeCompare(b.name)), [store.state.suppliers])
  const supplier = suppliers.find((s) => s.id === supplierId)

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stockItems(store.state)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [store.state, query])

  /** Per-unit price to record: what was typed (per pack), else this supplier's, else the cheapest, else average cost. */
  const unitPriceFor = (p: Product) => {
    const typed = parse(paid[p.id] ?? '')
    if (typed > 0) return Math.round((typed / Math.max(1, p.packSize)) * 100) / 100
    const prices = pricesFor(store.state, p.id)
    const known = prices.find((x) => x.supplierId === supplierId) ?? prices[0]
    return known?.unitPrice ?? p.cost
  }

  const chosen = stockItems(store.state).filter((p) => (packs[p.id] ?? 0) > 0)
  const total = chosen.reduce((t, p) => t + (packs[p.id] ?? 0) * p.packSize * unitPriceFor(p), 0)

  const step = (p: Product, by: -1 | 1) => {
    const next = Math.max(0, (packs[p.id] ?? 0) + by)
    if (next === (packs[p.id] ?? 0)) return
    Haptics.selectionAsync()
    setPacks((m) => ({ ...m, [p.id]: next }))
  }

  const save = () => {
    if (!chosen.length) return
    const ids = store.receiveRestock(
      chosen.map((p) => ({
        productId: p.id,
        supplierId: supplierId ?? '',
        qty: (packs[p.id] ?? 0) * p.packSize,
        unitPrice: unitPriceFor(p),
      })),
    )
    // Prices typed here become buying prices — only when we know where they're from
    let priced = 0
    if (supplier) {
      for (const p of chosen) {
        if (parse(paid[p.id] ?? '') > 0) {
          store.upsertSupplierPrice({ productId: p.id, supplierName: supplier.name, unitPrice: unitPriceFor(p) })
          priced++
        }
      }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    setToast({
      message: `Stock added · ${chosen.length} item${chosen.length === 1 ? '' : 's'}${priced ? ` · ${priced} price${priced === 1 ? '' : 's'} updated` : ''}`,
      // Undo takes the stock back out. Prices stay updated: they were true either way
      action: { label: 'Undo', onPress: () => store.undoRestock(ids) },
    })
    setPacks({})
    setPaid({})
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 170 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Where from? (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {suppliers.map((s) => {
            const on = s.id === supplierId
            return (
              <PressableScale
                key={s.id}
                onPress={() => {
                  Haptics.selectionAsync()
                  setSupplierId(on ? null : s.id)
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
        </ScrollView>

        <View style={styles.search}>
          <FilledInput label="Search items" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
        </View>

        {items.map((p, i) => {
          const n = packs[p.id] ?? 0
          return (
            <Animated.View key={p.id} layout={REFLOW}>
              <View style={styles.row}>
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <Text style={styles.detail} numberOfLines={1}>
                    {`${p.packSize > 1 ? p.packLabel : `by the ${p.unit}`} · ${unitQty(p, Math.max(0, p.stock))} left`}
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <PressableScale onPress={() => step(p, -1)} disabled={n === 0} accessibilityLabel={`One ${packWord(p)} fewer of ${p.name}`} style={[styles.stepBtn, n === 0 && styles.stepOff]}>
                    <MaterialIcon name="remove" size={18} color={colors.ink} />
                  </PressableScale>
                  <View style={styles.stepQty}>
                    <RollingNumber value={String(n)} style={styles.stepQtyText} />
                  </View>
                  <PressableScale onPress={() => step(p, 1)} accessibilityLabel={`One ${packWord(p)} more of ${p.name}`} style={[styles.stepBtn, styles.stepPlus]}>
                    <MaterialIcon name="add" size={18} color={colors.ink} />
                  </PressableScale>
                </View>
              </View>

              {n > 0 ? (
                <Animated.View entering={OPEN} exiting={CLOSE} style={styles.paidRow}>
                  <Text style={styles.paidLabel}>{`${packText(p, n)} · paid per ${packWord(p)}`}</Text>
                  <View style={styles.paidField}>
                    <Text style={styles.paidR}>R</Text>
                    <TextInput
                      value={paid[p.id] ?? ''}
                      onChangeText={(t) => setPaid((m) => ({ ...m, [p.id]: t }))}
                      keyboardType="decimal-pad"
                      placeholder={String(Math.round(unitPriceFor(p) * p.packSize * 100) / 100)}
                      placeholderTextColor={colors.quiet}
                      style={styles.paidInput}
                      accessibilityLabel={`Paid per ${packWord(p)} for ${p.name}`}
                    />
                  </View>
                </Animated.View>
              ) : null}

              {i === items.length - 1 ? null : <View style={styles.divider} />}
            </Animated.View>
          )
        })}
        {items.length === 0 ? <Text style={styles.empty}>{`No items match "${query.trim()}".`}</Text> : null}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.summary}>
          <Text style={styles.count}>{`${chosen.length} item${chosen.length === 1 ? '' : 's'}${supplier ? ` · ${supplier.name}` : ''}`}</Text>
          <RollingNumber value={money(total)} style={styles.total} />
        </View>
        <PrimaryButton label="Add to stock" onPress={save} disabled={chosen.length === 0} />
      </View>

      <ActionToast toast={toast} bottom={insets.bottom + 150} onDone={clearToast} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.lg },
  sectionTitle: { ...type.bodyStrong, color: colors.ink, marginBottom: space.sm },
  chips: { gap: space.sm, paddingRight: SIDE },
  chip: {
    height: 38,
    maxWidth: 220,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#E6E6E1',
    justifyContent: 'center',
    // transform stays listed: this style goes into PressableScale
    transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
    transitionDuration: [`${DURATION.press}ms`, `${DURATION.base}ms`, `${DURATION.base}ms`],
    transitionTimingFunction: ['ease-out', 'ease', 'ease'],
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  search: { marginTop: space.lg, marginBottom: space.sm },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  rowText: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.quiet },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.field, alignItems: 'center', justifyContent: 'center' },
  stepPlus: { backgroundColor: colors.brand },
  stepOff: { opacity: 0.4 },
  stepQty: { minWidth: 24, alignItems: 'center' },
  stepQtyText: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },

  paidRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.md },
  paidLabel: { ...type.caption, color: colors.quiet, flex: 1 },
  paidField: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 44, paddingHorizontal: space.md, borderRadius: radius.sm, backgroundColor: colors.field },
  paidR: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  paidInput: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, minWidth: 64, paddingVertical: 0, ...tabular },

  divider: { height: 1, backgroundColor: DIVIDER },
  empty: { ...type.body, color: colors.quiet, paddingTop: space.xl },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: space.md,
    gap: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: DIVIDER,
  },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  count: { fontFamily: fonts.semibold, fontSize: 15, color: colors.quiet, flexShrink: 1 },
  total: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink },
})
