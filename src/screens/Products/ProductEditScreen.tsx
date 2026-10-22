import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FilledInput from '../../components/ui/FilledInput'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { colors, DURATION, fonts, money, radius, space, type } from '../../theme/tokens'
import { pluralOf } from '../../lib/format'
import { makePortion } from '../../data/actions'
import { autoName, categoryFor, drinkName, formSummary, unitHint, type SellGroup } from './productFormModel'

const GROUPS = [
  { key: 'none', label: 'Its own tile' },
  { key: 'bread', label: 'Bread' },
  { key: 'colddrink', label: 'Cold drink' },
] as const

const SIDE = 28

// '' stays NaN instead of becoming 0; decimal comma accepted
const parseNumber = (s: string) => (s.trim() === '' ? NaN : Number(s.trim().replace(',', '.')))


/** "crate of 10" → "crate". Empty for "single loaf" or anything without a pack word. */
const packNameOf = (label: string) => label.match(/^([a-z]+) of \d/i)?.[1] ?? ''

/**
 * Add or edit a product. Stock isn't on the edit form — it changes through
 * counts, sales and restocks — only new products get an opening stock.
 *
 * Made-to-order food isn't created here: it needs ingredients to deduct stock,
 * and those are set from Sell (tap the food group's tile, then + or the pencil).
 */
export default function ProductEditScreen() {
  const { id = 'new' } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { state, addProduct, updateProduct, setPortion } = useStore()

  const existing = id !== 'new' ? state.products.find((p) => p.id === id) : undefined
  const isNew = !existing
  const madeToOrder = !!existing?.composite
  // Airtime's tile needs amounts, which this form doesn't edit, so its group is left alone
  const isAirtime = existing?.family === 'airtime'
  const showGroup = !madeToOrder && !isAirtime && (existing?.sellable ?? true)
  // Sizing applies to things cooked with: anything counted, once it exists
  const showKitchen = !!existing && !madeToOrder && !existing.untracked

  const [name, setName] = useState(existing?.name ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [detail, setDetail] = useState(existing?.detail ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [packSize, setPackSize] = useState(existing ? String(existing.packSize) : '1')
  const [packName, setPackName] = useState(existing ? packNameOf(existing.packLabel) : '')
  const [stock, setStock] = useState('0')
  // What a pack costs, shown as the owner buys it. Left alone, the cost stays as it is:
  // working it back into a per-unit cost after the pack size was edited would change it silently.
  const [packCost, setPackCost] = useState(
    existing && existing.cost > 0 ? String(Math.round(existing.cost * existing.packSize * 100) / 100) : '',
  )
  const [costTouched, setCostTouched] = useState(false)
  const [group, setGroup] = useState<SellGroup>(
    existing?.family === 'bread' || existing?.family === 'colddrink' ? existing.family : 'none',
  )
  const [brand, setBrand] = useState(existing?.variant ?? '')
  const [size, setSize] = useState(existing?.size ?? '')
  // The name the app last built from brand + size; the name follows them only while it still matches
  const [lastAuto, setLastAuto] = useState(existing ? drinkName(existing.variant ?? '', existing.size ?? '') : '')
  /** A cold drink's name, brand and size can't disagree: the name follows them until the owner types their own. */
  const follow = (b: string, sz: string) => {
    if (group !== 'colddrink') return
    setName((n) => autoName(n, lastAuto, b, sz))
    setLastAuto(drinkName(b, sz))
  }
  const [servedAs, setServedAs] = useState(existing?.portion?.plural ?? '')
  const [perUnit, setPerUnit] = useState(existing?.portion ? String(existing.portion.perUnit) : '')
  const [error, setError] = useState<string | null>(null)

  const unitWord = unit.trim().toLowerCase() || 'item'
  const packCount = parseNumber(packSize)
  const perPack = packCount > 1 ? packName.trim() || 'pack' : unitWord
  const summary = formSummary(
    {
      name,
      unit: unitWord,
      price: Number.isFinite(parseNumber(price)) ? parseNumber(price) : 0,
      packSize: Number.isFinite(packCount) && packCount > 0 ? packCount : 1,
      packName,
      packCost: Number.isFinite(parseNumber(packCost)) ? parseNumber(packCost) : undefined,
    },
    money,
  )

  function save() {
    const priceVal = parseNumber(price)
    const stockVal = parseNumber(stock)

    if (!name.trim()) return setError('Give the product a name.')
    if (!madeToOrder && !unit.trim()) return setError('Say how you count it, e.g. loaf, can, bottle.')
    if (isNaN(priceVal) || priceVal < 0) return setError('Enter the selling price.')
    if (isNew && (isNaN(stockVal) || stockVal < 0)) return setError('Enter how many you have now, or 0.')
    const packCostVal = parseNumber(packCost)
    if (costTouched && packCost.trim() !== '' && (isNaN(packCostVal) || packCostVal < 0)) return setError('Enter what you pay, or leave it empty.')

    const u = madeToOrder ? existing!.unit : unit.trim()
    const input = {
      name: name.trim(),
      detail: detail.trim() || u,
      category: categoryFor(existing?.category, showGroup ? group : 'none'),
      price: priceVal,
      stock: isNew ? stockVal : existing!.stock,
      unit: u,
      // An untouched unit keeps the plural it came with, so saving a starter
      // product never turns "loaves" into "loafs"
      unitPlural: existing && existing.unit === u ? existing.unitPlural : pluralOf(u),
      packSize: isNaN(packCount) || packCount <= 0 ? 1 : packCount,
      packName: packName.trim() || undefined,
      ...(costTouched && packCost.trim() !== '' ? { cost: packCostVal / (isNaN(packCount) || packCount <= 0 ? 1 : packCount) } : {}),
      ...(showGroup ? { family: group === 'none' ? null : group, variant: brand, size } : {}),
    }
    if (servedAs.trim() && !(parseNumber(perUnit) > 0)) return setError(`Say how many ${servedAs.trim()} come from one ${unitWord}, or clear "Served as".`)
    if (isNew) addProduct(input)
    else {
      updateProduct(existing.id, input)
      const portion = showKitchen ? makePortion(servedAs, parseNumber(perUnit)) : existing.portion ?? null
      if (JSON.stringify(portion ?? null) !== JSON.stringify(existing.portion ?? null)) setPortion(existing.id, portion)
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Without a title the header shows the route pattern, "products/[id]" */}
      <Stack.Screen options={{ title: isNew ? 'New product' : 'Edit product' }} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <FilledInput label="Product name, e.g. White bread" value={name} onChangeText={setName} autoCapitalize="words" />
        {madeToOrder ? (
          <Text style={styles.note}>
            Made to order. Change its ingredients from Profile → Menu, or tap it in the product list.
          </Text>
        ) : (
          <FilledInput
            label="How do you count it? — loaf, can, bottle"
            value={unit}
            onChangeText={setUnit}
            autoCapitalize="none"
            hint={unitHint(unit)}
          />
        )}
        <FilledInput label="Short description (optional)" value={detail} onChangeText={setDetail} />
        <FilledInput label={`What do you sell one ${unitWord} for?`} value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

        {showGroup ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shows on Sell under</Text>
            <Text style={styles.hint}>Bread and cold drinks share one tile, and you pick the brand when you sell.</Text>
            <View style={styles.chips}>
              {GROUPS.map((g) => {
                const on = g.key === group
                return (
                  <PressableScale
                    key={g.key}
                    onPress={() => {
                      Haptics.selectionAsync()
                      setGroup(g.key)
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && styles.chipOn]}
                    hitSlop={4}
                  >
                    <Text style={styles.chipText}>{g.label}</Text>
                  </PressableScale>
                )
              })}
            </View>
            {group !== 'none' ? (
              <FilledInput
                label={group === 'bread' ? 'Brand or kind — Albany, White, Brown' : 'Brand — Coke, Fanta, Sprite'}
                value={brand}
                onChangeText={(t) => {
                  setBrand(t)
                  follow(t, size)
                }}
                autoCapitalize="words"
              />
            ) : null}
            {group === 'colddrink' ? (
              <FilledInput
                label="Size — can, 500ml, 2L"
                value={size}
                onChangeText={(t) => {
                  setSize(t)
                  follow(brand, t)
                }}
                autoCapitalize="none"
              />
            ) : null}
          </View>
        ) : null}

        {madeToOrder ? null : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How you buy it</Text>
            <Text style={styles.hint}>Restock suggests whole packs, so it needs to know what a pack is.</Text>
            <FilledInput
              label={`How many ${pluralOf(unitWord)} in what you buy?`}
              value={packSize}
              onChangeText={setPackSize}
              keyboardType="number-pad"
              hint="Put 1 if you buy them one at a time."
            />
            {packCount > 1 ? (
              <FilledInput
                label="What's that called — tray, crate, box"
                value={packName}
                onChangeText={setPackName}
                autoCapitalize="none"
              />
            ) : null}
          </View>
        )}

        {madeToOrder ? null : (
          <FilledInput
            label={`What do you pay for one ${perPack}? (optional)`}
            value={packCost}
            onChangeText={(t) => {
              setPackCost(t)
              setCostTouched(true)
            }}
            keyboardType="decimal-pad"
            hint="Used for profit and stock value. It follows what you pay each time stock comes in."
          />
        )}

        {showKitchen ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>In the kitchen (optional)</Text>
            <Text style={styles.hint}>
              {`If you cook with it and serve it in something other than ${existing.unitPlural}: potatoes as chips, polony as slices. Recipes then count in those.`}
            </Text>
            <FilledInput label="Served as — chips, slices, spoons" value={servedAs} onChangeText={setServedAs} autoCapitalize="none" />
            {servedAs.trim() ? (
              <FilledInput
                label={`About how many ${servedAs.trim()} from one ${existing.unit}`}
                value={perUnit}
                onChangeText={setPerUnit}
                keyboardType="decimal-pad"
                hint="Rough is fine. Change it any time: every recipe keeps its amount and the stock it takes follows."
              />
            ) : null}
          </View>
        ) : null}

        {isNew ? (
          <FilledInput
            label={`How many ${pluralOf(unitWord)} you have now`}
            value={stock}
            onChangeText={setStock}
            keyboardType="decimal-pad"
            hint="Leave it at 0 if you're not sure. Count the shelf fixes it later."
          />
        ) : null}

        {/* The answers read back in shop words, so a wrong number shows before saving */}
        {!madeToOrder && summary.length ? (
          <View style={styles.note} accessibilityRole="summary">
            {summary.map((line) => (
              <Text key={line} style={styles.summaryLine}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}

        <PrimaryButton label={isNew ? 'Add product' : 'Save changes'} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.lg, gap: space.lg },
  error: {
    ...type.bodyStrong,
    color: colors.danger,
    backgroundColor: '#FDECEA',
    padding: space.lg,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  note: { ...type.body, color: colors.ink, backgroundColor: colors.brandSoft, padding: space.lg, borderRadius: radius.sm, overflow: 'hidden' },
  section: { gap: space.sm },
  sectionTitle: { ...type.bodyStrong, color: colors.ink },
  hint: { ...type.caption, color: colors.quiet },
  summaryLine: { ...type.body, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 38,
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
})
