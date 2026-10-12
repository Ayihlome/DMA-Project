import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { DIVIDER } from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import { useStore } from '../../store'
import { salesSince, startOfToday } from '../../data/inventory'
import type { Product, Sale } from '../../data/types'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { shortName } from '../Sell/sellModel'

const SIDE = 28
const OPEN = FadeIn.duration(200)
const CLOSE = FadeOut.duration(160)
const REFLOW = LinearTransition.duration(200)

const timeOf = (at: number) => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** "2× Albany bread, 1× MTN R29" */
const linesOf = (sale: Sale, products: Map<string, Product>) =>
  sale.lines.map((l) => `${l.qty}× ${shortName(products.get(l.productId), l.price, l.label)}`).join(', ')

/**
 * Today's sales, newest first, each with Void — reached by tapping today's
 * total on Home, which is where an owner looks when the number seems wrong.
 *
 * Void asks inline before it acts (Keep it / Void sale): it changes stock and
 * the day's total, so one tap shouldn't be enough. Voided sales stay listed at
 * the bottom, muted, so there's a record of what was taken back.
 */
export default function TodaysSalesScreen() {
  const insets = useSafeAreaInsets()
  const store = useStore()
  const [confirming, setConfirming] = useState<string | null>(null)

  const products = useMemo(() => new Map(store.state.products.map((p) => [p.id, p])), [store.state.products])
  const today = useMemo(() => {
    const since = startOfToday()
    return {
      sales: [...salesSince(store.state, since)].sort((a, b) => b.at - a.at),
      voided: (store.state.voidedSales ?? []).filter((v) => v.at >= since).sort((a, b) => b.voidedAt - a.voidedAt),
    }
  }, [store.state])
  const total = today.sales.reduce((t, s) => t + s.total, 0)

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]}>
      <Text style={styles.total}>{money(total)}</Text>
      <Text style={styles.lead}>
        {today.sales.length === 0 ? 'No sales yet today' : `${today.sales.length} sale${today.sales.length === 1 ? '' : 's'} today`}
      </Text>

      {today.sales.map((sale, i) => (
        <Animated.View key={sale.id} layout={REFLOW}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.title}>
                {`${money(sale.total)}`}
                <Text style={styles.titleMeta}>{`  ·  ${sale.payment ?? 'Cash'} · ${timeOf(sale.at)}`}</Text>
              </Text>
              <Text style={styles.detail} numberOfLines={2}>
                {linesOf(sale, products)}
              </Text>
            </View>
            {confirming === sale.id ? null : (
              <PressableScale
                onPress={() => setConfirming(sale.id)}
                accessibilityLabel={`Void sale of ${money(sale.total)} at ${timeOf(sale.at)}`}
                style={styles.voidLink}
                hitSlop={8}
              >
                <Text style={styles.voidLinkText}>Void</Text>
              </PressableScale>
            )}
          </View>

          {confirming === sale.id ? (
            <Animated.View entering={OPEN} exiting={CLOSE} style={styles.confirm}>
              <Text style={styles.confirmText}>{"Void this sale? Its stock goes back and it comes off today's total."}</Text>
              <View style={styles.confirmRow}>
                <PressableScale onPress={() => setConfirming(null)} accessibilityLabel="Keep this sale" containerStyle={styles.flex} style={styles.keep}>
                  <Text style={styles.keepText}>Keep it</Text>
                </PressableScale>
                <PressableScale
                  onPress={() => {
                    store.voidSale(sale.id)
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                    setConfirming(null)
                  }}
                  accessibilityLabel="Void this sale"
                  containerStyle={styles.flex}
                  style={styles.void}
                >
                  <Text style={styles.voidText}>Void sale</Text>
                </PressableScale>
              </View>
            </Animated.View>
          ) : null}

          {i === today.sales.length - 1 ? null : <View style={styles.divider} />}
        </Animated.View>
      ))}

      {today.voided.length ? (
        <Animated.View layout={REFLOW} style={styles.voidedBlock}>
          <Text style={styles.groupTitle} accessibilityRole="header">
            Voided today
          </Text>
          {today.voided.map((v) => (
            <View key={v.id} style={styles.voidedRow}>
              <Text style={styles.voidedText}>{`${money(v.total)} · ${timeOf(v.at)} · voided ${timeOf(v.voidedAt)}`}</Text>
              <Text style={styles.voidedLines} numberOfLines={1}>
                {linesOf(v, products)}
              </Text>
            </View>
          ))}
        </Animated.View>
      ) : null}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.lg },
  total: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 42, letterSpacing: -0.8, color: colors.ink, ...tabular },
  lead: { ...type.body, color: colors.quiet, marginBottom: space.lg },

  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 16 },
  rowText: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink, ...tabular },
  titleMeta: { fontFamily: fonts.medium, fontSize: 14, color: colors.quiet },
  detail: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.quiet },
  voidLink: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  voidLinkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },

  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#FDECEA', marginBottom: space.md },
  confirmText: { ...type.caption, color: colors.ink },
  confirmRow: { flexDirection: 'row', gap: space.sm },
  keep: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  void: { height: 48, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  voidText: { fontFamily: fonts.bold, fontSize: 15, color: colors.surface },

  divider: { height: 1, backgroundColor: DIVIDER },
  voidedBlock: { marginTop: space.xl, gap: space.sm },
  groupTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet },
  voidedRow: { gap: 2, paddingVertical: space.xs },
  voidedText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.quiet, textDecorationLine: 'line-through' },
  voidedLines: { fontFamily: fonts.medium, fontSize: 13, color: colors.quiet },
})
