import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import type { Product } from '../../data/types'
import { colors, radius, space, tabular, TAP, type } from '../../theme/tokens'

/** Counted quantity by product id. */
export type Counts = Record<string, number>

/**
 * "How much do you have now?" — the stock count, used both as an onboarding
 * step and on its own from the Dashboard banner.
 *
 * Three ways to enter the same number, because counting a shelf is not one
 * job: tap + for singles, tap the crate pill for the way stock actually
 * arrives, or type it when you already know. Everything starts at zero, and
 * zero is a legitimate answer — the point is that the owner said so.
 */
export default function StockCountList({
  products,
  counts,
  onChange,
}: {
  /** Stock items only; composites have no count of their own. */
  products: Product[]
  counts: Counts
  onChange: (counts: Counts) => void
}) {
  return (
    <View style={styles.list}>
      {products.map((p) => (
        <CountRow
          key={p.id}
          product={p}
          value={counts[p.id] ?? 0}
          onChange={(n) => onChange({ ...counts, [p.id]: n })}
        />
      ))}
    </View>
  )
}

/** Trailing zeros off, decimal comma on — "1,5 kg", not "1.500 kg". */
const show = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',')
const parse = (t: string) => Number(t.replace(',', '.').replace(/[^\d.]/g, ''))

function CountRow({
  product,
  value,
  onChange,
}: {
  product: Product
  value: number
  onChange: (n: number) => void
}) {
  // The field keeps its own text so a half-typed "1," survives the keystroke
  // that would otherwise round it away.
  const [text, setText] = useState(show(value))

  // Things sold by weight go up in halves; everything else is countable
  const step = product.unit === 'kg' ? 0.5 : 1
  const hasPack = product.packSize > 1

  const commit = (n: number) => {
    const clamped = Math.max(0, Math.round(n * 1000) / 1000)
    setText(show(clamped))
    onChange(clamped)
  }

  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {product.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {product.unitPlural}
          {hasPack ? ` · ${product.packLabel}` : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        <PressableScale
          onPress={() => commit(value - step)}
          disabled={value <= 0}
          accessibilityLabel={`One fewer ${product.name}`}
          style={[styles.step, value <= 0 && styles.stepOff]}
        >
          <MaterialIcon name="remove" size={18} color={value <= 0 ? colors.muted : colors.ink} />
        </PressableScale>

        <TextInput
          value={text}
          onChangeText={(t) => {
            setText(t)
            const n = parse(t)
            // An empty or half-typed field means zero until it says otherwise
            onChange(Number.isFinite(n) ? Math.max(0, n) : 0)
          }}
          onBlur={() => setText(show(value))}
          keyboardType="decimal-pad"
          inputMode="decimal"
          selectTextOnFocus
          accessibilityLabel={`How many ${product.unitPlural} of ${product.name}`}
          style={styles.field}
        />

        <PressableScale
          onPress={() => commit(value + step)}
          accessibilityLabel={`One more ${product.name}`}
          style={styles.step}
        >
          <MaterialIcon name="add" size={18} color={colors.ink} />
        </PressableScale>
      </View>

      {/* Stock arrives by the crate, so counting by the crate is the fast path */}
      {hasPack && (
        <PressableScale
          onPress={() => commit(value + product.packSize)}
          accessibilityLabel={`Add a ${product.packLabel} of ${product.name}`}
          style={styles.pack}
        >
          <Text style={styles.packText}>{`+ ${product.packLabel}`}</Text>
        </PressableScale>
      )}
    </View>
  )
}

export const styles = StyleSheet.create({
  list: { gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: space.sm,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  text: { flexGrow: 1, flexShrink: 1, flexBasis: 120, gap: 2 },
  name: { ...type.itemName, color: colors.ink },
  meta: { ...type.badge, color: colors.muted },

  controls: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  step: {
    width: TAP,
    height: TAP,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepOff: { backgroundColor: colors.disabled },
  field: {
    ...type.moneySm,
    ...tabular,
    width: 58,
    height: TAP,
    textAlign: 'center',
    color: colors.ink,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
  },

  pack: {
    paddingHorizontal: space.md,
    height: 32,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.field,
  },
  packText: { ...type.badge, color: colors.ink },
})
