import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { available, categoryLabel, coverLabel, daysCover, dashboardKpis, healthOf, needsAction, rand, unitQty, type Health, type Product } from '../core'
import { useNav } from '../nav'
import { useStore } from '../store'
import { EmptyState, Gradient, HScroll, Icon, ProductThumb, StatTile, StatusBadge, Tabs, ToggleGroup, s } from '../ui'
import { TAP, colors, radius, shadow, space, type } from '../theme'

type View_ = 'action' | 'all'
type Sort = 'urgent' | 'name'

const HEALTH_RANK: Record<Health, number> = { setup: 0, out: 1, critical: 2, low: 3, healthy: 4 }
const QTY_TONE: Record<Health, string> = {
  setup: colors.errorDefault,
  out: colors.errorDefault,
  critical: colors.errorDefault,
  low: colors.tertiary,
  healthy: colors.textSecondary,
}

function restockLabel(days: number) {
  if (!Number.isFinite(days)) return 'Not needed'
  if (days < 1) return 'Today'
  if (days < 2) return 'Tomorrow'
  return `In ${Math.floor(days)} days`
}

function InventoryRow({ product, urgent }: { product: Product; urgent: boolean }) {
  const { state } = useStore()
  const { navigate } = useNav()
  const health = healthOf(state, product)
  const left = available(state, product)
  return (
    <View style={[s.card, styles.row]}>
      <ProductThumb product={product} grayscale={health === 'setup'} />
      <View style={{ flex: 1, minWidth: 0, gap: space['2xs'] }}>
        <View style={[s.row, { flexWrap: 'wrap', gap: space.xs }]}>
          <Text style={[type.labelBold, { color: colors.textPrimary, flexShrink: 1 }]} numberOfLines={1}>
            {product.name}
          </Text>
          {(needsAction(health) || !urgent) && <StatusBadge health={health} solid={urgent} />}
        </View>
        <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1}>
          {categoryLabel(product.category)} · {product.detail}
        </Text>
        <Text style={[type.captionMedium, { color: QTY_TONE[health] }]}>
          {health === 'setup'
            ? 'Add its recipe to start selling'
            : `${product.composite ? `${left} can be made` : `${unitQty(product, left)} left`} · ${coverLabel(state, product)}`}
        </Text>
      </View>
      {!product.composite && needsAction(health) && (
        <Pressable
          onPress={() => navigate({ name: 'supply', item: product.id })}
          accessibilityRole="button"
          accessibilityLabel={`Compare prices for ${product.name}`}
          style={({ pressed }) => [styles.compare, pressed && { backgroundColor: colors.accentTint }]}
        >
          <Icon name="compare_arrows" color={colors.primary} />
        </Pressable>
      )}
    </View>
  )
}

export default function Dashboard() {
  const { state } = useStore()
  const { navigate } = useNav()
  const [view, setView] = useState<View_>('action')
  const [sort, setSort] = useState<Sort>('urgent')
  const k = dashboardKpis(state)

  const rows = useMemo(() => {
    const base = view === 'action' ? state.products.filter((p) => needsAction(healthOf(state, p))) : state.products
    return [...base].sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name)
        : HEALTH_RANK[healthOf(state, a)] - HEALTH_RANK[healthOf(state, b)] || daysCover(state, a) - daysCover(state, b),
    )
  }, [state, view, sort])

  const actionCount = state.products.filter((p) => needsAction(healthOf(state, p))).length
  const urgentCount = state.products.filter((p) => ['setup', 'out', 'critical'].includes(healthOf(state, p))).length
  const trend = k.salesYesterday > 0 ? Math.round(((k.salesToday - k.salesYesterday) / k.salesYesterday) * 100) : null
  const soonestItem = state.products.filter((p) => !p.composite).sort((a, b) => daysCover(state, a) - daysCover(state, b))[0]

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 96 }}>
        <View style={styles.greeting}>
          <View style={[s.row, { gap: space.xs }]}>
            <Text style={[type.h1, { color: colors.textPrimary, flexShrink: 1 }]} accessibilityRole="header">
              Sawubona, {state.profile.ownerName}
            </Text>
            <Icon name="waving_hand" color={colors.brandPurple} />
          </View>
          <Text style={[type.body, { color: colors.textSecondary }]} numberOfLines={1}>
            Ready for trade at {state.profile.storeName}
          </Text>
        </View>

        <View style={{ paddingHorizontal: space.md, paddingVertical: space['2xs'] }}>
          <HScroll>
            <StatTile
              style={styles.tile}
              label="Sales today"
              icon="payments"
              value={rand(k.salesToday, { whole: true })}
              sub={
                trend === null ? (
                  `${k.salesCount} sales`
                ) : (
                  <View style={[s.row, { gap: 2 }]}>
                    <Icon name={trend >= 0 ? 'trending_up' : 'trending_down'} size="xs" color={trend >= 0 ? colors.secondary : colors.errorDefault} />
                    <Text style={[type.caption, { color: trend >= 0 ? colors.secondary : colors.errorDefault }]} numberOfLines={1}>
                      {trend >= 0 ? '+' : ''}
                      {trend}% vs yesterday
                    </Text>
                  </View>
                )
              }
            />
            <StatTile
              style={styles.tile}
              label="Need attention"
              icon="notification_important"
              iconTone={[colors.errorTint, colors.errorDefault]}
              tone={actionCount ? colors.errorDefault : colors.secondary}
              value={actionCount ? `${actionCount} items` : 'None'}
              sub={urgentCount ? `${urgentCount} critical or blocked` : 'All stock healthy'}
            />
            <StatTile
              style={styles.tile}
              label="Stock value"
              icon="warehouse"
              iconTone={[colors.brandPurpleTint, colors.brandPurple]}
              value={rand(k.stockValue, { whole: true })}
              sub={`${k.itemCount} stock items at cost`}
            />
            <StatTile
              style={styles.tile}
              label="Next restock"
              icon="local_shipping"
              iconTone={[colors.brandGreenTint, colors.brandGreen]}
              value={restockLabel(k.soonest)}
              sub={soonestItem && Number.isFinite(k.soonest) ? `${soonestItem.name} runs out first` : undefined}
            />
          </HScroll>
        </View>

        <View style={styles.controls}>
          <Tabs
            label="Inventory view"
            value={view}
            onChange={setView}
            items={[
              { key: 'action', label: 'Action needed', count: actionCount },
              { key: 'all', label: 'All inventory', count: state.products.length },
            ]}
          />
          <ToggleGroup
            label="Sort inventory"
            value={sort}
            onChange={setSort}
            items={[
              { key: 'urgent', label: 'Most urgent' },
              { key: 'name', label: 'A–Z' },
            ]}
          />
        </View>

        <View style={{ paddingHorizontal: space.md, gap: space.sm }}>
          {rows.length === 0 ? (
            <View style={s.card}>
              <EmptyState icon="verified" title="Everything is well stocked" body="No items are expected to run out in the next few days." />
            </View>
          ) : (
            rows.map((p) => <InventoryRow key={p.id} product={p} urgent={view === 'action'} />)
          )}
          {view === 'action' && rows.length > 0 && (
            <View style={styles.note}>
              <Icon name="verified" color={colors.primary} />
              <Text style={[type.caption, { color: colors.primary, flex: 1 }]}>
                The other {state.products.length - rows.length} items are above their safe stock levels.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Record Sale FAB in the bottom-right thumb zone */}
      <Pressable onPress={() => navigate({ name: 'sales' })} accessibilityRole="button" style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}>
        <Gradient angle="diagonal" style={StyleSheet.absoluteFill} />
        <Icon name="add" color={colors.onPrimary} />
        <Text style={[type.labelBold, { color: colors.onPrimary }]}>Record Sale</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  greeting: { paddingHorizontal: space.md, paddingTop: space.md, paddingBottom: space.sm },
  tile: { width: 160, height: 112 },
  controls: { paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.sm, gap: space.sm },
  row: { padding: space.md, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  compare: { width: TAP, height: TAP, borderRadius: radius.lg, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  note: { marginTop: space['2xs'], padding: space.md, borderRadius: radius.xl, backgroundColor: colors.accentTint, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  fab: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    minHeight: TAP,
    paddingHorizontal: space.lg,
    borderRadius: radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    overflow: 'hidden',
    ...shadow.float,
  },
})
