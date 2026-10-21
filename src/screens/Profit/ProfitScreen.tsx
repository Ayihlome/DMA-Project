import React, { useMemo } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ListRow from '../../components/ui/ListRow'
import { useStore } from '../../store'
import { colors, fonts, money, space, type } from '../../theme/tokens'
import { profitReport, type ItemRow } from './profitModel'

const SIDE = 28

/** The one muted line under an item: what it sells for, what it costs, and how many went this week. */
function detailFor(r: ItemRow) {
  if (!r.margin) return 'Add what you pay to see what you keep'
  const sold = r.sold > 0 ? ` · ${r.sold} sold` : ''
  return `Sells ${money(r.margin.price)} · costs ${money(r.margin.cost)}${sold}`
}

/**
 * What the shop keeps. Nothing here is on Home or Sell on purpose: it is for the
 * owner sitting down to think about prices, not for the counter.
 *
 * Costs come from what the owner pays when stock comes in, so an item without a
 * cost says so instead of showing a profit it can't know.
 */
export default function ProfitScreen() {
  const insets = useSafeAreaInsets()
  const { state } = useStore()
  // The clock is read once per visit; this screen is not a live view
  const [now] = React.useState(() => Date.now())
  const report = useMemo(() => profitReport(state, now), [state, now])

  const open = (r: ItemRow) =>
    r.product.composite ? router.push('/menu') : router.push({ pathname: '/products/[id]', params: { id: r.product.id } })

  const sales = report.takings > 0
  const partial = sales && report.covered < 0.995

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxl }]} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        Last 7 days
      </Text>
      {sales ? (
        <View style={styles.summary}>
          <Text style={styles.big}>{money(report.kept)}</Text>
          <Text style={styles.bigLabel}>kept after what the stock cost you</Text>
          <Text style={styles.line}>{`Took ${money(report.takings)} · stock cost ${money(report.cost)}`}</Text>
          {partial ? (
            <Text style={styles.note}>
              {`Counts ${Math.round(report.covered * 100)}% of your takings. The rest is items with no cost yet, listed below.`}
            </Text>
          ) : null}
          <Text style={styles.note}>Worked out from the costs you have now, not what you paid on the day.</Text>
        </View>
      ) : (
        <Text style={styles.empty}>No sales in the last 7 days yet. Once you sell something, what you keep shows here.</Text>
      )}

      <Text style={[styles.sectionTitle, styles.second]} accessibilityRole="header">
        By item
      </Text>
      {report.items.length === 0 ? <Text style={styles.empty}>Nothing to sell yet.</Text> : null}
      {report.items.map((r, i) => (
        <ListRow
          key={r.product.id}
          title={r.product.name}
          detail={detailFor(r)}
          onPress={() => open(r)}
          last={i === report.items.length - 1}
          trailing={
            r.margin ? (
              <View style={styles.keep}>
                <Text style={styles.keepAmount}>{money(r.margin.keep)}</Text>
                <Text style={styles.keepPercent}>{`${r.margin.percent}%`}</Text>
              </View>
            ) : undefined
          }
        />
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: SIDE, paddingTop: space.lg, backgroundColor: colors.surface },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet, marginBottom: space.sm },
  second: { marginTop: space.xl, marginBottom: 2 },
  summary: { gap: space.xs },
  big: { fontFamily: fonts.extrabold, fontSize: 34, lineHeight: 40, letterSpacing: -0.6, color: colors.ink },
  bigLabel: { ...type.body, color: colors.quiet },
  line: { ...type.bodyStrong, color: colors.ink, marginTop: space.sm },
  note: { ...type.caption, color: colors.muted, marginTop: space.xs },
  empty: { ...type.body, color: colors.quiet },
  keep: { alignItems: 'flex-end', marginRight: space.sm },
  keepAmount: { ...type.moneySm, color: colors.ink },
  keepPercent: { ...type.caption, color: colors.muted },
})
