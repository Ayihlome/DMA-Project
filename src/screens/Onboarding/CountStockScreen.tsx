import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { stockItems } from '../../data/inventory'
import StockCountList, { type Counts } from './StockCountList'
import { colors, space, type } from '../../theme/tokens'

/**
 * The quick count, reached from Home (and the Dashboard before it) by anyone who chose
 * "Count later" during setup.
 *
 * Same list as the onboarding step, and it starts from whatever the products
 * already say rather than from zero, so a second pass corrects a count instead
 * of replacing it.
 */
export default function CountStockScreen() {
  const insets = useSafeAreaInsets()
  const { state, setStockCounts } = useStore()

  // Things with a shelf count — no kotas (derived) and no airtime (untracked).
  // Anything that went negative is listed first: it's the most wrong.
  const countable = useMemo(
    () =>
      stockItems(state).sort(
        (a, b) => Number(b.stock < 0) - Number(a.stock < 0) || a.name.localeCompare(b.name),
      ),
    [state],
  )

  /**
   * Owner-only warnings. Sales are never refused for stock, so the app's
   * numbers can drift; this is where the owner finds out where.
   */
  const oversold = useMemo(() => countable.filter((p) => p.stock < 0), [countable])
  const unrecipied = useMemo(
    () => state.products.filter((p) => p.composite && (p.soldWithoutRecipe ?? 0) > 0),
    [state.products],
  )

  // A negative count can't be real; start those from 0 so the owner types the truth
  const [counts, setCounts] = useState<Counts>(() =>
    Object.fromEntries(countable.map((p) => [p.id, Math.max(0, p.stock)])),
  )

  function save() {
    setStockCounts(counts)
    router.back()
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <Text style={styles.title} accessibilityRole="header">
          Count your stock
        </Text>
        <Text style={styles.subtitle}>
          Once the app knows what is on the shelf it can tell you what is running low and what to buy.
        </Text>
        {oversold.length > 0 || unrecipied.length > 0 ? (
          <View style={styles.notice} accessibilityRole="summary">
            <Text style={styles.noticeTitle}>Check these first</Text>
            {oversold.map((p) => (
              <Text key={p.id} style={styles.noticeLine}>
                {`${p.name}: sold ${Math.abs(p.stock)} more than the app had. Count what's really on the shelf.`}
              </Text>
            ))}
            {unrecipied.map((p) => (
              <Text key={p.id} style={styles.noticeLine}>
                {`${p.name}: sold ${p.soldWithoutRecipe} without a recipe, so its ingredients weren't taken off stock. Count them below.`}
              </Text>
            ))}
          </View>
        ) : null}
        <StockCountList products={countable} counts={counts} onChange={setCounts} />
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton label="Save the count" onPress={save} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: space.lg, gap: space.md },
  title: { ...type.titleSm, color: colors.ink },
  subtitle: { ...type.caption, color: colors.muted, marginBottom: space.xs },
  notice: {
    gap: space.sm,
    padding: space.lg,
    borderRadius: 16,
    backgroundColor: colors.brandSoft,
  },
  noticeTitle: { ...type.bodyStrong, color: colors.ink },
  noticeLine: { ...type.caption, color: colors.ink },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
})
