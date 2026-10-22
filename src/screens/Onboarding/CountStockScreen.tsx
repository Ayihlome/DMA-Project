import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { stockItems, unitQty } from '../../data/inventory'
import { recipeSuggestions, withChange, type RecipeSuggestion } from '../../data/recipeCheck'
import { toPortions } from '../../data/actions'
import type { Product } from '../../data/types'
import StockCountList, { type Counts } from './StockCountList'
import { colors, fonts, radius, space, type } from '../../theme/tokens'

/** A recipe amount the way the menu shows it: "13 chips" for a sized ingredient, else "150 g", "2 slices". */
function recipeAmount(p: Product, qty: number) {
  if (!p.portion) return unitQty(p, qty)
  const n = Math.round(toPortions(p, qty) * 10) / 10
  return `${n} ${n === 1 ? p.portion.name : p.portion.plural}`
}

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
  const { state, setStockCounts, saveMenuItem } = useStore()

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

  // Nothing is counted until the owner touches a row: an item they didn't look at
  // keeps the app's number (a negative one stays flagged) instead of being saved as counted
  const [counts, setCounts] = useState<Counts>({})
  const countedRows = Object.keys(counts).length

  // After saving: ingredients that ran lower than the recipes explain, and what the owner said about each
  const [review, setReview] = useState<RecipeSuggestion[] | null>(null)
  const [decided, setDecided] = useState<Record<string, 'updated' | 'kept'>>({})

  function save() {
    // Worked out before the count goes in: it compares the count with what the app expected
    const suggestions = recipeSuggestions(state, counts)
    setStockCounts(counts)
    if (suggestions.length) setReview(suggestions)
    else router.back()
  }

  function update(s: RecipeSuggestion) {
    for (const c of s.changes) {
      const item = state.products.find((p) => p.id === c.menuId)
      if (!item?.recipe) continue
      saveMenuItem(
        { name: item.name, price: item.price, menu: item.menu ?? 'Menu', recipe: withChange(item.recipe, s.ingredient.id, c.to) },
        item.id,
      )
    }
    setDecided((d) => ({ ...d, [s.ingredient.id]: 'updated' }))
  }

  if (review) {
    return (
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}>
          <Text style={styles.title} accessibilityRole="header">
            Check your recipes
          </Text>
          <Text style={styles.subtitle}>
            Your count is saved. These ran lower than your recipes explain. If you use more per item than the recipe
            says, update it. If some went to waste, keep it as it is.
          </Text>
          {review.map((s) => {
            const p = s.ingredient
            const done = decided[p.id]
            return (
              <View key={p.id} style={styles.card}>
                <Text style={styles.noticeTitle}>{p.name}</Text>
                <Text style={styles.noticeLine}>
                  {`The app expected about ${unitQty(p, s.expected)}, you counted ${unitQty(p, s.counted)}. ${s.servings} sold since your last count.`}
                </Text>
                {s.changes.map((c) => (
                  <Text key={c.menuId} style={styles.change}>
                    {`${c.menuName}: ${recipeAmount(p, c.from)} → ${recipeAmount(p, c.to)}`}
                  </Text>
                ))}
                {done ? (
                  <Text style={styles.done}>{done === 'updated' ? 'Recipe updated' : 'Kept as it is'}</Text>
                ) : (
                  <View style={styles.choices}>
                    <PressableScale
                      onPress={() => setDecided((d) => ({ ...d, [p.id]: 'kept' }))}
                      containerStyle={styles.flex}
                      style={styles.keep}
                      accessibilityLabel={`Keep the ${p.name} amounts as they are`}
                    >
                      <Text style={styles.choiceText}>Keep as is</Text>
                    </PressableScale>
                    <PressableScale
                      onPress={() => update(s)}
                      containerStyle={styles.flex}
                      style={styles.apply}
                      accessibilityLabel={`Update the ${p.name} amounts in the recipes`}
                    >
                      <Text style={styles.choiceText}>Update recipe</Text>
                    </PressableScale>
                  </View>
                )}
              </View>
            )
          })}
        </ScrollView>
        <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
          <PrimaryButton label="Done" onPress={() => router.back()} />
        </View>
      </View>
    )
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
                {`${p.name}: sold ${p.soldWithoutRecipe} without a recipe, so its ingredients weren't taken off stock. Count them below, and add its ingredients in Menu.`}
              </Text>
            ))}
          </View>
        ) : null}
        <StockCountList products={countable} counts={counts} onChange={setCounts} />
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton
          label={countedRows ? `Save the count · ${countedRows} item${countedRows === 1 ? '' : 's'}` : 'Save the count'}
          onPress={save}
          disabled={countedRows === 0}
        />
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
  card: { gap: space.sm, padding: space.lg, borderRadius: 16, backgroundColor: colors.brandSoft },
  change: { ...type.bodyStrong, color: colors.ink },
  done: { ...type.caption, color: colors.muted, marginTop: space.xs },
  choices: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  flex: { flex: 1 },
  keep: { height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  apply: { height: 44, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
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
