import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingTop: spacing.xs },
  sectionLabel: { ...type.captionMedium, color: colors.textSecondary, letterSpacing: 0.8, marginBottom: spacing.xs },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.bgBase, borderRadius: 8, padding: spacing.xs, minHeight: 48 },
  itemIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  itemName: { ...type.labelBold, color: colors.textPrimary },
  itemVariant: { ...type.caption, color: colors.textSecondary },
  swapBtn: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  statsRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xs },
  statCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: spacing.xs },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { ...type.labelBold, color: colors.textPrimary },
  statUnit: { ...type.caption, color: colors.textSecondary, fontWeight: '400' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  sectionTitle: { ...type.labelBold, color: colors.textPrimary },
  sectionHint: { ...type.caption, color: colors.textSecondary },
  countPill: { backgroundColor: colors.surfaceContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 9999 },
  countPillText: { ...type.captionMedium, color: colors.textSecondary },

  cardList: { gap: spacing.sm, paddingBottom: spacing.sm },

  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  supplierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  supplierBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  timestamp: { ...type.caption, color: colors.textSecondary },
  radio: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  radioActive: { backgroundColor: colors.primary },

  namePriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.xs },
  supplierName: { ...type.labelBold, color: colors.textPrimary, flex: 1 },
  supplierPrice: { ...type.h1, color: colors.textPrimary },
  perUnit: { ...type.caption, color: colors.textSecondary, fontWeight: '400' },

  packRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  packText: { ...type.caption, color: colors.textSecondary },
  packValue: { ...type.bodyMedium, color: colors.textPrimary },
  minPill: { backgroundColor: colors.surfaceContainerLow, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  minText: { ...type.captionMedium, color: colors.textPrimary },

  deliveryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xs, paddingTop: spacing.xs },
  deliveryText: { ...type.caption, color: colors.textSecondary },

  deltaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xs, paddingTop: spacing.xs },
  deltaText: { ...type.caption, color: colors.textSecondary },

  warningBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.warningTint, borderRadius: 8, padding: 8, marginTop: spacing.xs },
  warningText: { ...type.captionMedium, color: colors.textPrimary, flex: 1 },

  addPlaceholder: { marginHorizontal: spacing.md, minHeight: 104, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderDisabled, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', padding: spacing.md, gap: 4 },
  addPlaceholderIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  addPlaceholderTitle: { ...type.labelBold, color: colors.textPrimary },
  addPlaceholderSub: { ...type.caption, color: colors.textSecondary },

  trendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  trendTitle: { ...type.labelBold, color: colors.textPrimary, flex: 1, marginRight: spacing.xs },
  trendDelta: { ...type.captionMedium, color: colors.secondary },
  sparkline: { height: 40, marginBottom: spacing.xs },
  trendFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  trendFooterText: { ...type.caption, color: colors.textSecondary },

  applyBtn: { backgroundColor: colors.primary, height: 48, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  applyBtnSuccess: { backgroundColor: colors.secondary },
  applyBtnText: { ...type.labelBold, color: colors.onPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(18,28,44,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.bgSurface, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: spacing.md, gap: spacing.sm },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalTitle: { ...type.h2, color: colors.textPrimary },
  modalClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { ...type.captionMedium, color: colors.textSecondary, marginBottom: 4 },
  input: { height: 48, backgroundColor: colors.bgBase, borderRadius: 8, paddingHorizontal: spacing.sm, ...type.body, color: colors.textPrimary },
})
