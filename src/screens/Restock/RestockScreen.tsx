import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import { router } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcon from '../../components/common/MaterialIcon'
import ActionToast, { type Toast } from '../../components/ui/ActionToast'
import ListRow, { DIVIDER } from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import { useTabBarSpace } from '../../components/nav/TabBar'
import { stockItems, stockUncounted, unitQty } from '../../data/inventory'
import type { Product } from '../../data/types'
import { useHints } from '../../lib/hints'
import { paidPerUnit, unpricedLines } from '../StockIn/stockInModel'
import { useStore } from '../../store'
import { colors, DURATION, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { groupBySupplier, packText, restockList, URGENCY_LABEL, type RestockItem } from './restockModel'

const SIDE = 28

// Module scope: layout-animation builders shouldn't be rebuilt every render
const OPEN = FadeIn.duration(200)
const CLOSE = FadeOut.duration(160)
const REFLOW = LinearTransition.duration(200)

/**
 * Restock: the shopping list for the next trip, grouped by where each item is
 * cheapest. Tick what you're buying, adjust a quantity by tapping its pill,
 * then "Bought it · update stock" adds the ticked packs to stock.
 *
 * Everything starts ticked — the list is the app's suggestion, and the common
 * case is buying it as suggested. Ticks and adjusted quantities live on this
 * screen only; the list itself is recalculated from sales and stock.
 */
export default function RestockScreen() {
  const store = useStore()
  const insets = useSafeAreaInsets()
  const tabSpace = useTabBarSpace()

  const items = useMemo(() => restockList(store.state), [store.state])
  const groups = useMemo(() => groupBySupplier(items), [items])
  const uncounted = stockUncounted(store.state)

  const [unticked, setUnticked] = useState<Set<string>>(new Set())
  const [packs, setPacks] = useState<Record<string, number>>({})
  const [open, setOpen] = useState<string | null>(null)
  // Prompt 3: the trip just recorded with "Bought it", until the owner answers "What did you pay?"
  const [paidFor, setPaidFor] = useState<string[] | null>(null)
  const hints = useHints()
  const paidKey = paidFor ? `paid:${paidFor.join(',')}` : ''
  const unpriced = paidFor && hints.ready && !hints.isAnswered(paidKey) ? unpricedLines(store.state, paidFor) : []
  const [toast, setToast] = useState<Toast | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  // Rows switched to "Loose" count single units instead of packs — the owner bought 3 loaves, not a crate
  const [loose, setLoose] = useState<Record<string, boolean>>({})

  /** What the stepper shows: packs, or units on a loose row. */
  const packsFor = (it: RestockItem) =>
    packs[it.product.id] ?? (loose[it.product.id] ? it.packs * it.product.packSize : it.packs)
  /** Units actually bought. */
  const qtyFor = (it: RestockItem) => packsFor(it) * (loose[it.product.id] ? 1 : it.product.packSize)
  const ticked = items.filter((it) => !unticked.has(it.product.id))
  const total = ticked.reduce((t, it) => t + Math.round(qtyFor(it) * it.unitPrice * 100) / 100, 0)

  /** Switches a row between packs and loose units, keeping roughly the same amount. */
  const toggleLoose = (it: RestockItem) => {
    Haptics.selectionAsync()
    const size = it.product.packSize
    const isLoose = !!loose[it.product.id]
    const n = packsFor(it)
    setPacks((p) => ({ ...p, [it.product.id]: isLoose ? Math.max(1, Math.ceil(n / size)) : n * size }))
    setLoose((l) => ({ ...l, [it.product.id]: !isLoose }))
  }

  const toggle = (id: string) => {
    Haptics.selectionAsync()
    setUnticked((u) => {
      const next = new Set(u)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const step = (it: RestockItem, by: -1 | 1) => {
    const next = Math.max(1, packsFor(it) + by)
    if (next === packsFor(it)) return
    Haptics.selectionAsync()
    setPacks((p) => ({ ...p, [it.product.id]: next }))
  }

  const bought = () => {
    if (!ticked.length) return
    const ids = store.receiveRestock(
      ticked.map((it) => ({
        productId: it.product.id,
        supplierId: it.supplierId,
        qty: qtyFor(it),
        // Nothing here says what was actually paid, only what a supplier listed, so no
        // price is recorded and each item's cost stays as it was. Stock came in takes the real price.
        unitPrice: 0,
      })),
    )
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    // The stock is in already; asking what was paid comes after, and is optional
    setPaidFor(ids)
    // A mis-tap here would add a whole trip of stock, so the toast carries Undo
    setToast({
      message: `Stock updated · ${ticked.length} item${ticked.length === 1 ? '' : 's'}`,
      tone: 'success',
      action: {
        label: 'Undo',
        onPress: () => {
          store.undoRestock(ids)
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
      },
    })
    setUnticked(new Set())
    setPacks({})
    setLoose({})
    setOpen(null)
  }

  const barBottom = tabSpace - space.lg

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xl, paddingBottom: barBottom + 150 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Shopping list
        </Text>
        <Text style={styles.subtitle}>What to buy so you last the next week</Text>

        {unpriced.length ? (
          <PaidPrompt
            lines={unpriced}
            onSave={(paid) => {
              store.recordPaid(paidFor!, paid)
              hints.mark(paidKey, 'done')
              setPaidFor(null)
            }}
            onDismiss={() => {
              hints.mark(paidKey, 'dismissed')
              setPaidFor(null)
            }}
          />
        ) : null}

        {stockItems(store.state).length === 0 ? (
          <View style={styles.emptyBlock}>
            <ListRow
              title="Nothing on the list yet"
              detail="Add what you sell, and the list fills in as it sells"
              onPress={() => router.push('/products')}
              last
            />
          </View>
        ) : uncounted ? (
          <View style={styles.emptyBlock}>
            <ListRow
              title="Count the shelf first"
              detail="Then the list knows what you have and what's selling"
              onPress={() => router.push('/count-stock')}
              last
            />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Nothing to buy — everything should last the next week.</Text>
        ) : (
          groups.map((g) => (
            <Animated.View key={g.supplierId || 'none'} layout={REFLOW} style={styles.group}>
              <Text style={styles.groupTitle} accessibilityRole="header">
                {g.supplier}
              </Text>
              {g.items.map((it, i) => (
                <Animated.View key={it.product.id} layout={REFLOW}>
                  <RestockRow
                    item={it}
                    packs={packsFor(it)}
                    loose={!!loose[it.product.id]}
                    onLoose={() => toggleLoose(it)}
                    checked={!unticked.has(it.product.id)}
                    open={open === it.product.id}
                    last={i === g.items.length - 1}
                    onToggle={() => toggle(it.product.id)}
                    onPill={() => {
                      Haptics.selectionAsync()
                      setOpen((o) => (o === it.product.id ? null : it.product.id))
                    }}
                    onStep={(by) => step(it, by)}
                  />
                </Animated.View>
              ))}
            </Animated.View>
          ))
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View style={[styles.bar, { paddingBottom: barBottom }]}>
          <View style={styles.summary}>
            {/* From listed prices, never from what was paid */}
            <Text style={styles.count}>{`${ticked.length} item${ticked.length === 1 ? '' : 's'} · Estimated total`}</Text>
            <RollingNumber value={money(total)} style={styles.total} />
          </View>
          <PrimaryButton label="Bought it · update stock" onPress={bought} disabled={ticked.length === 0} />
        </View>
      ) : null}

      <ActionToast toast={toast} bottom={barBottom + (items.length ? 130 : 0)} onDone={clearToast} />
    </View>
  )
}

function RestockRow({
  item,
  packs,
  loose,
  onLoose,
  checked,
  open,
  last,
  onToggle,
  onPill,
  onStep,
}: {
  item: RestockItem
  /** Packs, or single units when `loose`. */
  packs: number
  loose: boolean
  onLoose: () => void
  checked: boolean
  open: boolean
  last: boolean
  onToggle: () => void
  onPill: () => void
  onStep: (by: -1 | 1) => void
}) {
  const p = item.product
  const amount = loose ? `${packs} ${packs === 1 ? p.unit : p.unitPlural}` : packText(p, packs)
  const unitWord = loose ? p.unit : 'pack'
  return (
    <View>
      <View style={styles.row}>
        {/* The whole left side toggles — a 30px box alone is a small target at a counter */}
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${p.name}, ${URGENCY_LABEL[item.urgency]}, ${amount}`}
          style={styles.toggleArea}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Animated.View style={[styles.check, checked && styles.checkOn]}>
            <Animated.View style={[styles.tick, checked && styles.tickOn]}>
              <MaterialIcon name="check" size={16} color={colors.ink} />
            </Animated.View>
          </Animated.View>
          <View style={styles.nameCol}>
            <Animated.Text style={[styles.name, !checked && styles.nameOff]} numberOfLines={2}>
              {p.name}
            </Animated.Text>
            <View style={[styles.badge, BADGE[item.urgency]]}>
              <Text style={[styles.badgeText, BADGE_TEXT[item.urgency]]}>{URGENCY_LABEL[item.urgency]}</Text>
            </View>
          </View>
        </Pressable>

        <PressableScale
          onPress={onPill}
          accessibilityLabel={`${amount}. ${open ? 'Hide' : 'Change amount'}`}
          accessibilityState={{ expanded: open }}
          style={[styles.pill, open && styles.pillOpen]}
          hitSlop={8}
        >
          <Text style={styles.pillText}>{amount}</Text>
        </PressableScale>
      </View>

      {open ? (
        <Animated.View entering={OPEN} exiting={CLOSE} style={styles.detail}>
          <Text style={styles.reason}>{item.reason}</Text>
          {/* Only things bought in packs have a second way to count them */}
          {p.packSize > 1 ? (
            <PressableScale
              onPress={onLoose}
              accessibilityRole="button"
              accessibilityLabel={loose ? `Count ${p.name} in packs instead` : `Count ${p.name} as loose ${p.unitPlural} instead`}
              style={[styles.pill, loose && styles.pillOpen]}
              hitSlop={6}
            >
              <Text style={styles.pillText}>{loose ? 'Loose' : 'Packs'}</Text>
            </PressableScale>
          ) : null}
          <View style={styles.stepper}>
            <PressableScale onPress={() => onStep(-1)} disabled={packs <= 1} accessibilityLabel={`One ${unitWord} fewer`} style={[styles.stepBtn, packs <= 1 && styles.stepOff]}>
              <MaterialIcon name="remove" size={18} color={colors.ink} />
            </PressableScale>
            <View style={styles.stepQty}>
              <RollingNumber value={String(packs)} style={styles.stepQtyText} />
            </View>
            <PressableScale onPress={() => onStep(1)} accessibilityLabel={`One ${unitWord} more`} style={[styles.stepBtn, styles.stepPlus]}>
              <MaterialIcon name="add" size={18} color={colors.ink} />
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}

      {last ? null : <View style={styles.divider} />}
    </View>
  )
}

/**
 * Prompt 3, after "Bought it": what did the trip cost? Optional and after the
 * fact — the stock is already in. Each total typed becomes that item's cost the
 * way a priced delivery would; anything left empty keeps its cost. A supplier's
 * listed price is never taken as what was paid.
 */
function PaidPrompt({
  lines,
  onSave,
  onDismiss,
}: {
  lines: { product: Product; qty: number }[]
  onSave: (paid: Record<string, number>) => void
  onDismiss: () => void
}) {
  const [typed, setTyped] = useState<Record<string, string>>({})
  const paid = Object.fromEntries(
    lines.map((l) => [l.product.id, paidPerUnit(typed[l.product.id], l.qty)] as const).filter(([, n]) => n > 0),
  )
  const any = Object.keys(paid).length > 0

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(160)} style={styles.prompt} accessibilityRole="summary">
      <Text style={styles.promptTitle}>What did you pay?</Text>
      <Text style={styles.promptText}>Optional. The stock is in already; a price here keeps Profit honest.</Text>
      {lines.map((l) => (
        <View key={l.product.id} style={styles.promptRow}>
          <Text style={styles.promptName} numberOfLines={2}>
            {`${l.product.name} · ${unitQty(l.product, l.qty)}`}
          </Text>
          <Text style={styles.promptR}>R</Text>
          <TextInput
            value={typed[l.product.id] ?? ''}
            onChangeText={(t) => setTyped((m) => ({ ...m, [l.product.id]: t }))}
            keyboardType="decimal-pad"
            placeholder="Total"
            placeholderTextColor={colors.quiet}
            style={styles.promptInput}
            accessibilityLabel={`What you paid in total for ${unitQty(l.product, l.qty)} of ${l.product.name}`}
          />
        </View>
      ))}
      <View style={styles.promptActions}>
        <PressableScale onPress={onDismiss} accessibilityLabel="Not now, don't ask what this trip cost" hitSlop={8}>
          <Text style={styles.promptLink}>Not now</Text>
        </PressableScale>
        <PressableScale onPress={() => onSave(paid)} disabled={!any} accessibilityRole="button" style={[styles.promptSave, !any && styles.promptOff]}>
          <Text style={styles.promptSaveText}>Save prices</Text>
        </PressableScale>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  prompt: { gap: space.sm, padding: space.lg, marginTop: space.lg, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  promptTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  promptText: { ...type.caption, color: colors.ink },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  promptName: { ...type.caption, color: colors.ink, flex: 1 },
  promptR: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  promptInput: {
    ...tabular,
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.ink,
    width: 88,
    height: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  promptActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xs },
  promptLink: { fontFamily: fonts.medium, fontSize: 14, color: colors.quiet, textDecorationLine: 'underline' },
  promptSave: { height: 40, paddingHorizontal: space.lg, borderRadius: radius.md, backgroundColor: colors.brand, justifyContent: 'center' },
  promptSaveText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  promptOff: { opacity: 0.4 },
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE },
  title: { fontFamily: fonts.extrabold, fontSize: 30, lineHeight: 36, letterSpacing: -0.6, color: colors.ink },
  subtitle: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.quiet, marginTop: 4 },

  group: { marginTop: space.xl },
  groupTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet, marginBottom: 2 },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 16 },
  toggleArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    transitionProperty: 'backgroundColor',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease',
  },
  checkOn: { backgroundColor: colors.brand },
  // Starts at 0.8, not 0 — nothing in the real world appears from nothing
  tick: {
    opacity: 0,
    transform: [{ scale: 0.8 }],
    transitionProperty: 'opacity, transform',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease-out',
  },
  tickOn: { opacity: 1, transform: [{ scale: 1 }] },
  nameCol: { flex: 1, alignItems: 'flex-start', gap: 4 },
  // Word and colour both say it, so it reads without colour too
  badge: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.pill },
  badgeText: { ...type.badge, fontFamily: fonts.bold },
  name: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
    alignSelf: 'stretch',
    transitionProperty: 'color',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease',
  },
  nameOff: { color: colors.quiet },
  pill: {
    height: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    justifyContent: 'center',
  },
  pillOpen: { backgroundColor: colors.brandSoft },
  pillText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, ...tabular },

  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.md,
    paddingLeft: 30 + space.md,
  },
  reason: { ...type.caption, color: colors.quiet, flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepPlus: { backgroundColor: colors.brand },
  stepOff: { opacity: 0.4 },
  stepQty: { minWidth: 24, alignItems: 'center' },
  stepQtyText: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 21, color: colors.ink },

  divider: { height: 1, backgroundColor: DIVIDER },
  empty: { ...type.body, color: colors.quiet, paddingTop: space.xl },
  emptyBlock: { marginTop: space.lg },

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
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  count: { fontFamily: fonts.semibold, fontSize: 16, color: colors.quiet },
  total: { fontFamily: fonts.extrabold, fontSize: 24, lineHeight: 30, letterSpacing: -0.4, color: colors.ink },
})

const BADGE = StyleSheet.create({
  critical: { backgroundColor: colors.dangerSoft },
  medium: { backgroundColor: colors.warningSoft },
  low: { backgroundColor: colors.field },
})

const BADGE_TEXT = StyleSheet.create({
  critical: { color: colors.danger },
  medium: { color: colors.warning },
  low: { color: colors.quiet },
})
