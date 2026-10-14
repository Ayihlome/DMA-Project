import React, { useState } from 'react'
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import FilledInput from '../../components/ui/FilledInput'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { CATEGORIES, type CategoryKey } from '../../data/types'
import { colors, DURATION, fonts, radius, space, type } from '../../theme/tokens'
import { pluralOf } from '../../lib/format'

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
  const { state, addProduct, updateProduct } = useStore()

  const existing = id !== 'new' ? state.products.find((p) => p.id === id) : undefined
  const isNew = !existing
  const madeToOrder = !!existing?.composite

  const [name, setName] = useState(existing?.name ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [detail, setDetail] = useState(existing?.detail ?? '')
  const [category, setCategory] = useState<CategoryKey>(existing?.category ?? 'pantry')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [packSize, setPackSize] = useState(existing ? String(existing.packSize) : '1')
  const [packName, setPackName] = useState(existing ? packNameOf(existing.packLabel) : '')
  const [stock, setStock] = useState('0')
  const [error, setError] = useState<string | null>(null)

  const unitWord = unit.trim().toLowerCase() || 'item'
  const packCount = parseNumber(packSize)

  function save() {
    const priceVal = parseNumber(price)
    const stockVal = parseNumber(stock)

    if (!name.trim()) return setError('Give the product a name.')
    if (!madeToOrder && !unit.trim()) return setError('Say what it is counted in, e.g. loaf, can, bottle.')
    if (isNaN(priceVal) || priceVal < 0) return setError('Enter the selling price.')
    if (isNew && (isNaN(stockVal) || stockVal < 0)) return setError('Enter how many you have now, or 0.')

    const u = madeToOrder ? existing!.unit : unit.trim()
    const input = {
      name: name.trim(),
      detail: detail.trim() || u,
      category,
      price: priceVal,
      stock: isNew ? stockVal : existing!.stock,
      unit: u,
      // An untouched unit keeps the plural it came with, so saving a starter
      // product never turns "loaves" into "loafs"
      unitPlural: existing && existing.unit === u ? existing.unitPlural : pluralOf(u),
      packSize: isNaN(packCount) || packCount <= 0 ? 1 : packCount,
      packName: packName.trim() || undefined,
    }
    if (isNew) addProduct(input)
    else updateProduct(existing.id, input)
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    router.back()
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
            label="Counted in — loaf, can, bottle"
            value={unit}
            onChangeText={setUnit}
            autoCapitalize="none"
            hint="One word. It's used in “per loaf” and “3 loaves left”."
          />
        )}
        <FilledInput label="Short description (optional)" value={detail} onChangeText={setDetail} />
        <FilledInput label="Selling price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map((c) => {
              const on = c.key === category
              return (
                <PressableScale
                  key={c.key}
                  onPress={() => {
                    Haptics.selectionAsync()
                    setCategory(c.key)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, on && styles.chipOn]}
                  hitSlop={4}
                >
                  <Text style={styles.chipText}>{c.label}</Text>
                </PressableScale>
              )
            })}
          </View>
        </View>

        {madeToOrder ? null : (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How you buy it</Text>
            <Text style={styles.hint}>Restock suggests whole packs, so it needs to know what a pack is.</Text>
            <FilledInput
              label={`How many ${pluralOf(unitWord)} in what you buy`}
              value={packSize}
              onChangeText={setPackSize}
              keyboardType="number-pad"
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

        {isNew ? (
          <FilledInput
            label={`How many ${pluralOf(unitWord)} you have now`}
            value={stock}
            onChangeText={setStock}
            keyboardType="decimal-pad"
            hint="Leave it at 0 if you're not sure. Count stock fixes it later."
          />
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
