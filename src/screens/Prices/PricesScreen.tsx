import React, { useEffect, useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, LinearTransition } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FilledInput from '../../components/ui/FilledInput'
import { DIVIDER } from '../../components/ui/ListRow'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useTabBarSpace } from '../../components/nav/TabBar'
import { useStore } from '../../store'
import { colors, DURATION, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import AddPriceSheet, { type PriceEdit } from './AddPriceSheet'
import { perUnit, priceRows, type PriceRowData } from './pricesModel'

const SIDE = 28
/** The dark yellow the spec uses for "Add" — readable on white, unlike the brand yellow. */
const ADD = '#8A6A00'

// Module scope: layout-animation builders shouldn't be rebuilt every render
const OPEN = FadeIn.duration(200)
const CLOSE = FadeOut.duration(160)
const REFLOW = LinearTransition.duration(200)
const TOAST_ENTER = FadeInDown.duration(200)
const TOAST_EXIT = FadeOutDown.duration(160)

/**
 * Buying prices: what suppliers charge the shop, cheapest first. Titled
 * "Buying" because a bare "Prices" reads as selling prices. A plain list, one
 * main button.
 *
 * A row with two or more prices opens to show every supplier, cheapest in
 * black and the rest muted. The rows below glide down to make room rather than
 * jumping (200ms) — the only motion on the screen.
 */
export default function PricesScreen() {
  const store = useStore()
  const insets = useSafeAreaInsets()
  const tabSpace = useTabBarSpace()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string | null>(null)
  const [edit, setEdit] = useState<PriceEdit | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const rows = useMemo(() => priceRows(store.state, query), [store.state, query])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2600)
    return () => clearTimeout(t)
  }, [toast])

  /** Spec: 2+ prices opens the row. One price or none: straight to adding one. */
  const onRow = (r: PriceRowData) => {
    if (r.prices.length >= 2) {
      Haptics.selectionAsync()
      setOpen((o) => (o === r.product.id ? null : r.product.id))
    } else {
      setEdit({ productId: r.product.id })
    }
  }

  // Where the fixed button sits: just above the floating tab bar
  const buttonBottom = tabSpace - space.lg

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xl, paddingBottom: buttonBottom + 64 + space.xl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title} accessibilityRole="header">
          Buying prices
        </Text>
        <Text style={styles.subtitle}>What suppliers charge you. Cheapest first.</Text>

        <View style={styles.search}>
          <FilledInput label="Search items" value={query} onChangeText={setQuery} autoCorrect={false} returnKeyType="search" />
        </View>

        {rows.map((r, i) => (
          <Animated.View key={r.product.id} layout={REFLOW}>
            <PriceRow
              row={r}
              open={open === r.product.id}
              last={i === rows.length - 1}
              onPress={() => onRow(r)}
              onSupplier={(supplier, unitPrice) => setEdit({ productId: r.product.id, supplier, unitPrice })}
            />
          </Animated.View>
        ))}

        {rows.length === 0 ? (
          <Text style={styles.empty}>
            {query.trim()
              ? `No items match "${query.trim()}".`
              : 'No stock items yet. Add products, then record what you pay for them.'}
          </Text>
        ) : null}
      </ScrollView>

      {/* A white strip behind the button, so the list doesn't show through around it */}
      <View style={[styles.buttonBar, { paddingBottom: buttonBottom }]} pointerEvents="box-none">
        <PrimaryButton label="Add a buying price" onPress={() => setEdit({})} />
      </View>

      {toast ? (
        <Animated.View
          key={toast}
          entering={TOAST_ENTER}
          exiting={TOAST_EXIT}
          style={[styles.toast, { bottom: buttonBottom + 58 + space.md }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.toastText} numberOfLines={2}>
            {toast}
          </Text>
        </Animated.View>
      ) : null}

      <AddPriceSheet edit={edit} onSaved={setToast} onClose={() => setEdit(null)} />
    </View>
  )
}

function PriceRow({
  row,
  open,
  last,
  onPress,
  onSupplier,
}: {
  row: PriceRowData
  open: boolean
  last: boolean
  onPress: () => void
  onSupplier: (supplier: string, unitPrice: number) => void
}) {
  const [down, setDown] = useState(false)
  const { product, prices } = row
  const cheapest = prices[0]
  const more = prices.length >= 2

  return (
    <View>
      <Pressable
        onPress={onPress}
        onPressIn={() => setDown(true)}
        onPressOut={() => setDown(false)}
        pressRetentionOffset={16}
        accessibilityRole="button"
        accessibilityState={more ? { expanded: open } : undefined}
        accessibilityLabel={
          cheapest
            ? `${product.name}, cheapest ${money(cheapest.unitPrice)} ${perUnit(product)} at ${cheapest.supplier}${more ? `, ${prices.length} suppliers` : ''}`
            : `${product.name}, no price yet. Add one.`
        }
      >
        <Animated.View style={[styles.row, down && styles.rowDown]}>
          <View style={styles.rowText}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.detail} numberOfLines={1}>
              {cheapest ? `Cheapest at ${cheapest.supplier}` : 'No price yet'}
            </Text>
          </View>
          {cheapest ? (
            // The unit sits right under the number it describes
            <View style={styles.priceCol}>
              <Text style={styles.price}>{money(cheapest.unitPrice)}</Text>
              <Text style={styles.priceUnit}>{perUnit(product)}</Text>
            </View>
          ) : (
            <Text style={styles.add}>Add</Text>
          )}
        </Animated.View>
      </Pressable>

      {open ? (
        <Animated.View entering={OPEN} exiting={CLOSE} style={styles.suppliers}>
          {prices.map((x, i) => (
            <Pressable
              key={x.id}
              onPress={() => onSupplier(x.supplier, x.unitPrice)}
              accessibilityRole="button"
              accessibilityLabel={`${x.supplier}, ${money(x.unitPrice)}. Change this price.`}
              style={({ pressed }) => [styles.supplierLine, pressed && styles.supplierPressed]}
            >
              <Text style={[styles.supplierName, i > 0 && styles.muted]} numberOfLines={1}>
                {x.supplier}
              </Text>
              <Text style={[styles.supplierPrice, i > 0 && styles.muted]}>{money(x.unitPrice)}</Text>
            </Pressable>
          ))}
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
  search: { marginTop: space.xl, marginBottom: space.sm },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 17,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(17,17,17,0)',
    transitionProperty: 'backgroundColor',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: 'ease',
  },
  rowDown: { backgroundColor: 'rgba(17,17,17,0.05)' },
  rowText: { flex: 1, gap: 3 },
  name: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.quiet },
  priceCol: { alignItems: 'flex-end' },
  price: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.ink, ...tabular },
  priceUnit: { fontFamily: fonts.medium, fontSize: 12, color: colors.quiet },
  add: { fontFamily: fonts.bold, fontSize: 16, color: ADD },

  suppliers: { paddingBottom: space.md, gap: 2 },
  supplierLine: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  supplierPressed: { opacity: 0.55 },
  supplierName: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, flex: 1 },
  supplierPrice: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, ...tabular },
  muted: { color: colors.quiet },

  divider: { height: 1, backgroundColor: DIVIDER },
  empty: { ...type.body, color: colors.quiet, textAlign: 'center', paddingTop: space.xl },

  buttonBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: space.md,
    backgroundColor: colors.surface,
  },
  toast: {
    position: 'absolute',
    left: SIDE,
    right: SIDE,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.surface },
})
