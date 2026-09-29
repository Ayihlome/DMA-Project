import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingTop: spacing.xs },

  greetRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, gap: spacing.xs },
  greeting: { ...type.h1, color: colors.textPrimary },
  greetingSub: { ...type.body, color: colors.textSecondary, marginTop: 2 },
  syncPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.successTint, paddingHorizontal: spacing.xs, paddingVertical: 4, borderRadius: radius.full },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.secondary },
  syncText: { ...type.captionMedium, color: colors.secondary },

  kpiList: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingVertical: spacing.xs },
  kpiCard: { ...card.base, width: 148, height: 106, justifyContent: 'space-between' },
  kpiTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  kpiLabel: { ...type.captionMedium, color: colors.textSecondary, flex: 1, marginRight: 4 },
  kpiIconWrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  kpiValue: { ...type.h1, color: colors.textPrimary },
  kpiSub: { ...type.caption, color: colors.textSecondary },

  tabRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 4, flex: 1, marginRight: spacing.xs },
  tab: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 8, gap: 6 },
  tabActive: { backgroundColor: colors.bgSurface, ...shadow.sm },
  tabText: { ...type.label, color: colors.textSecondary },
  tabTextActive: { ...type.labelBold, color: colors.primary },
  alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.errorDefault },
  sortBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.bgSurface, alignItems: 'center', justifyContent: 'center', ...shadow.sm },

  list: { paddingHorizontal: spacing.md, gap: spacing.sm, paddingTop: spacing.xs },
  itemCard: { ...card.base, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemThumb: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemImage: { width: 40, height: 40, borderRadius: 8 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { ...type.labelBold, color: colors.textPrimary },
  itemVariant: { ...type.caption, color: colors.textSecondary, marginTop: 1 },
  itemStock: { ...type.captionMedium, marginTop: 4 },
  itemActions: { alignItems: 'flex-end', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { ...type.captionMedium, color: '#FFFFFF', fontWeight: '700', letterSpacing: 0.5 },
  orderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceContainer, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, minHeight: 36 },
  orderBtnText: { ...type.captionMedium, color: colors.primary, fontWeight: '700' },

  clearNote: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: `${colors.accentTint}99`, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xs },
  clearIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  clearText: { ...type.caption, color: colors.primary, flex: 1 },

  fab: { position: 'absolute', right: spacing.md },
  fabBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#319795', paddingHorizontal: spacing.md, paddingVertical: 12, borderRadius: 12, ...shadow.md },
  fabText: { ...type.labelBold, color: colors.onPrimary },
})
