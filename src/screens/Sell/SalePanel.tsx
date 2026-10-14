import React from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import RollingNumber from '../../components/ui/RollingNumber'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import type { Product } from '../../data/types'
import { draftTotal, recentLines, shortName, type Draft } from './sellModel'

const SHOWN = 3

/**
 * The bottom panel: the last three lines of the sale, then Undo · Park ·
 * Charge. It runs to the bottom edge with the floating tab bar sitting over its
 * lower part, so `bottomSpace` keeps the buttons clear of the bar.
 */
export default function SalePanel({
  draft,
  products,
  bottomSpace,
  onUndo,
  onPark,
  onCharge,
  onLayout,
}: {
  draft: Draft
  products: Map<string, Product>
  bottomSpace: number
  onUndo: () => void
  onPark: () => void
  onCharge: () => void
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  const lines = recentLines(draft)
  const total = draftTotal(draft)
  const empty = lines.length === 0
  const more = lines.length - SHOWN

  return (
    <View style={[styles.panel, { paddingBottom: bottomSpace }]} onLayout={onLayout}>
      <View style={styles.lines}>
        {empty ? (
          <Text style={styles.empty}>Tap an item to start a sale</Text>
        ) : (
          lines.slice(0, SHOWN).map((l) => (
            <View key={l.key} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {`${l.qty}× ${shortName(products.get(l.productId), l.price, l.label)}`}
              </Text>
              <Text style={styles.lineTotal}>{money(l.qty * l.price)}</Text>
            </View>
          ))
        )}
        {more > 0 ? <Text style={styles.more}>{`+ ${more} more ${more === 1 ? 'line' : 'lines'}`}</Text> : null}
      </View>

      <View style={styles.buttons}>
        <PressableScale
          onPress={onUndo}
          disabled={draft.history.length === 0}
          accessibilityLabel="Undo the last add"
          style={[styles.secondary, draft.history.length === 0 && styles.off]}
        >
          <MaterialIcon name="undo" size={18} color={colors.ink} />
          <Text style={styles.secondaryText}>Undo</Text>
        </PressableScale>
        <PressableScale
          onPress={onPark}
          disabled={empty}
          accessibilityLabel="Park this sale"
          style={[styles.secondary, empty && styles.off]}
        >
          <MaterialIcon name="pause" size={18} color={colors.ink} />
          <Text style={styles.secondaryText}>Park</Text>
        </PressableScale>
        <PressableScale
          onPress={onCharge}
          disabled={empty}
          accessibilityLabel={`Charge ${money(total)}`}
          containerStyle={styles.chargeHit}
          style={[styles.charge, empty && styles.chargeOff]}
        >
          <Text style={[styles.chargeText, empty && styles.chargeTextOff]}>Charge&nbsp;</Text>
          <RollingNumber value={money(total)} style={[styles.chargeText, empty && styles.chargeTextOff]} />
        </PressableScale>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    gap: space.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  lines: { gap: 6, minHeight: 22 },
  empty: { ...type.caption, color: colors.muted },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lineName: { ...type.bodyStrong, color: colors.ink, flex: 1 },
  lineTotal: { ...type.bodyStrong, ...tabular, color: colors.ink },
  more: { ...type.badge, color: colors.muted },
  buttons: { flexDirection: 'row', gap: space.sm },
  secondary: {
    height: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  off: { opacity: 0.4 },
  chargeHit: { flex: 1 },
  charge: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
  },
  chargeOff: { backgroundColor: colors.disabled },
  chargeText: { ...type.button, color: colors.brand },
  chargeTextOff: { color: colors.muted },
})
