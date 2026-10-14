import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
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
import { stockUncounted } from '../../data/inventory'
import { useStore } from '../../store'
import { colors, DURATION, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { groupBySupplier, lineCost, packText, restockDayName, restockList, type RestockItem } from './restockModel'

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
  const [toast, setToast] = useState<Toast | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const packsFor = (it: RestockItem) => packs[it.product.id] ?? it.packs
  const ticked = items.filter((it) => !unticked.has(it.product.id))
  const total = ticked.reduce((t, it) => t + lineCost(it, packsFor(it)), 0)

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
        qty: packsFor(it) * it.product.packSize,
        unitPrice: it.unitPrice,
      })),
    )
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    // A mis-tap here would add a whole trip of stock, so the toast carries Undo
    setToast({
      message: `Stock updated · ${ticked.length} item${ticked.length === 1 ? '' : 's'} · ${money(total)}`,
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
          Restock
        </Text>
        <Text style={styles.subtitle}>{`Your shopping list for ${restockDayName(store.state)}`}</Text>

        {uncounted ? (
          <View style={styles.emptyBlock}>
            <ListRow
              title="Count your stock first"
              detail="Then the list knows what you have and what's selling"
              onPress={() => router.push('/count-stock')}
              last
            />
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{`Nothing to buy — everything should last past ${restockDayName(store.state)}.`}</Text>
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
            <Text style={styles.count}>{`${ticked.length} item${ticked.length === 1 ? '' : 's'}`}</Text>
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
  checked,
  open,
  last,
  onToggle,
  onPill,
  onStep,
}: {
  item: RestockItem
  packs: number
  checked: boolean
  open: boolean
  last: boolean
  onToggle: () => void
  onPill: () => void
  onStep: (by: -1 | 1) => void
}) {
  const p = item.product
  return (
    <View>
      <View style={styles.row}>
        {/* The whole left side toggles — a 30px box alone is a small target at a counter */}
        <Pressable
          onPress={onToggle}
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          accessibilityLabel={`${p.name}, ${packText(p, packs)}`}
          style={styles.toggleArea}
          hitSlop={{ top: 8, bottom: 8 }}
        >
          <Animated.View style={[styles.check, checked && styles.checkOn]}>
            <Animated.View style={[styles.tick, checked && styles.tickOn]}>
              <MaterialIcon name="check" size={16} color={colors.ink} />
            </Animated.View>
          </Animated.View>
          <Animated.Text style={[styles.name, !checked && styles.nameOff]} numberOfLines={2}>
            {p.name}
          </Animated.Text>
        </Pressable>

        <PressableScale
          onPress={onPill}
          accessibilityLabel={`${packText(p, packs)}. ${open ? 'Hide' : 'Change amount'}`}
          accessibilityState={{ expanded: open }}
          style={[styles.pill, open && styles.pillOpen]}
          hitSlop={8}
        >
          <Text style={styles.pillText}>{packText(p, packs)}</Text>
        </PressableScale>
      </View>

      {open ? (
        <Animated.View entering={OPEN} exiting={CLOSE} style={styles.detail}>
          <Text style={styles.reason}>{item.reason}</Text>
          <View style={styles.stepper}>
            <PressableScale onPress={() => onStep(-1)} disabled={packs <= 1} accessibilityLabel="One pack fewer" style={[styles.stepBtn, packs <= 1 && styles.stepOff]}>
              <MaterialIcon name="remove" size={18} color={colors.ink} />
            </PressableScale>
            <View style={styles.stepQty}>
              <RollingNumber value={String(packs)} style={styles.stepQtyText} />
            </View>
            <PressableScale onPress={() => onStep(1)} accessibilityLabel="One pack more" style={[styles.stepBtn, styles.stepPlus]}>
              <MaterialIcon name="add" size={18} color={colors.ink} />
            </PressableScale>
          </View>
        </Animated.View>
      ) : null}

      {last ? null : <View style={styles.divider} />}
    </View>
  )
}

const styles = StyleSheet.create({
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
  name: {
    fontFamily: fonts.bold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.ink,
    flex: 1,
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
