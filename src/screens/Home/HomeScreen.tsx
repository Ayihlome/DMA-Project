import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import YellowHeaderScreen from '../../components/layout/YellowHeaderScreen'
import ListRow from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import { useStore } from '../../store'
import { colors, fonts, money, radius, space } from '../../theme/tokens'
import { homeSummary, profitRow, salesLine } from './homeModel'
import { commonBrands } from '../../data/starterPacks'

/** Spec: header height 300. */
const HEADER = 300

/**
 * Home: today's money, one way into a sale, three rows. Nothing else.
 *
 * The total rolls when it changes — tabs stay mounted, so coming back from a
 * sale on Sell shows the number climbing to its new value. That's the one bit
 * of motion here, and it earns it: it's the owner's answer to "how's today?".
 */
export default function HomeScreen() {
  const store = useStore()
  const summary = useMemo(() => homeSummary(store.state), [store.state])
  const menuCount = useMemo(() => store.state.products.filter((p) => p.composite && p.sellable).length, [store.state.products])
  // Hidden until something sold this week has a known cost
  const profit = useMemo(() => profitRow(store.state), [store.state])

  // Asked once, only of a shop with no Bread or Cold drink tile: real catalogues are the owner's
  const offer = store.state.sellGrid?.brandsOffer
  const brands = useMemo(
    () =>
      offer || store.state.products.some((p) => p.family === 'bread' || p.family === 'colddrink')
        ? []
        : commonBrands(store.state.products),
    [offer, store.state.products],
  )
  const addBrands = () => {
    for (const input of brands) store.addProduct(input)
    store.updateSellGrid({ brandsOffer: 'added' })
  }
  const initial = (store.state.profile.ownerName.trim()[0] ?? '?').toUpperCase()

  return (
    <YellowHeaderScreen
      headerHeight={HEADER}
      header={
        <View style={styles.header}>
          <View style={styles.topRow}>
            <Text style={styles.today} accessibilityRole="header">
              Today
            </Text>
            <PressableScale
              onPress={() => router.navigate('/profile')}
              accessibilityLabel="Profile"
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{initial}</Text>
            </PressableScale>
          </View>

          {/* Tap the money to see (and void) today's sales — where you'd look if the number seems wrong */}
          <PressableScale
            onPress={() => router.push('/sales-today')}
            containerStyle={styles.moneyHit}
            style={styles.money}
            accessibilityLabel={`${money(summary.total)} today. ${salesLine(summary.count)}.${summary.vsYesterday ? ` ${summary.vsYesterday.replace(/^[▲▼] /, '')}.` : ''} Shows today's sales.`}
          >
            {/* Rolling digits can't shrink-to-fit like plain text, so a big day steps the size down */}
            <RollingNumber
              value={money(summary.total)}
              style={[styles.total, money(summary.total).length > 9 && styles.totalLong]}
            />
            <Text style={styles.count}>{`${salesLine(summary.count)}  ›`}</Text>
            {summary.vsYesterday ? <Text style={styles.compare}>{summary.vsYesterday}</Text> : null}
          </PressableScale>
        </View>
      }
    >
      <PrimaryButton label="New sale" height={64} onPress={() => router.navigate('/sales')} />

      {brands.length ? (
        <View style={styles.offer} accessibilityRole="summary">
          <Text style={styles.offerTitle}>Add common brands?</Text>
          <Text style={styles.offerText}>
            White and brown bread, Coke and Fanta, each with its own Bread or Cold drink tile on Sell. Prices are rough;
            change them after.
          </Text>
          <View style={styles.offerRow}>
            <PressableScale
              onPress={() => store.updateSellGrid({ brandsOffer: 'dismissed' })}
              containerStyle={styles.flex}
              style={styles.offerNo}
              accessibilityLabel="No thanks, don't add common brands"
            >
              <Text style={styles.offerBtnText}>No thanks</Text>
            </PressableScale>
            <PressableScale
              onPress={addBrands}
              containerStyle={styles.flex}
              style={styles.offerYes}
              accessibilityLabel={`Add ${brands.length} common brands`}
            >
              <Text style={styles.offerBtnText}>{`Add ${brands.length}`}</Text>
            </PressableScale>
          </View>
        </View>
      ) : null}

      <View style={styles.rows}>
        {summary.uncounted ? (
          <ListRow
            title="Running low"
            detail="Count the shelf first to see this"
            onPress={() => router.push('/count-stock')}
          />
        ) : summary.lowCount > 0 ? (
          <ListRow
            leading={<View style={styles.dot} />}
            title={`${summary.lowCount} item${summary.lowCount === 1 ? '' : 's'} running low`}
            detail={summary.lowNames}
            onPress={() => router.navigate('/restock')}
          />
        ) : (
          <ListRow title="Nothing running low" onPress={() => router.navigate('/restock')} />
        )}

        {profit ? <ListRow title={profit.title} detail={profit.detail} onPress={() => router.push('/profit')} /> : null}

        <ListRow title="Stock came in" detail="Add a delivery or a shopping trip" onPress={() => router.push('/stock-in')} />

        <ListRow
          title="Count the shelf"
          detail={summary.toCheck > 0 ? `${summary.toCheck} to check first` : undefined}
          onPress={() => router.push('/count-stock')}
        />

        {/* Recipes are what take ingredients off stock, so changing them is a daily job, not a setting */}
        <ListRow
          title="Menu"
          detail={menuCount ? `${menuCount} item${menuCount === 1 ? '' : 's'} · prices and ingredients` : 'Add food you make'}
          onPress={() => router.push('/menu')}
          last
        />
      </View>
    </YellowHeaderScreen>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  offer: { gap: space.sm, padding: space.lg, borderRadius: 16, backgroundColor: colors.brandSoft, marginTop: space.lg },
  offerTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  offerText: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.ink },
  offerRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  offerNo: { height: 44, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  offerYes: { height: 44, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  offerBtnText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  header: { flex: 1, paddingTop: space.lg, paddingBottom: 44, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  today: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.brand },
  moneyHit: { alignSelf: 'flex-start' },
  money: { gap: 4 },
  total: { fontFamily: fonts.extrabold, fontSize: 52, lineHeight: 60, letterSpacing: -1.6, color: colors.ink },
  totalLong: { fontSize: 40, lineHeight: 48, letterSpacing: -1.2 },
  // Ink at 70% rather than a grey: grey on yellow looks dirty
  count: { fontFamily: fonts.semibold, fontSize: 16, color: 'rgba(17,17,17,0.7)' },
  compare: { fontFamily: fonts.medium, fontSize: 14, color: 'rgba(17,17,17,0.7)', marginTop: 2 },
  rows: { marginTop: space.lg },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger },
})
