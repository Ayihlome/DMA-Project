import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingTop: spacing.xs },

  banner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.xs },
  bannerTitle: { ...type.labelBold, color: colors.textPrimary },
  bannerSub: { ...type.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, marginTop: 4, marginBottom: spacing.md },
  smartBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.accentTint, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999 },
  smartBadgeText: { ...type.captionMedium, color: colors.primary },

  budgetRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  budgetLabel: { ...type.caption, color: colors.textSecondary },
  budgetInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  budgetCurrency: { ...type.display, color: colors.textPrimary },
  budgetInput: { ...type.display, color: colors.textPrimary, width: 120, padding: 0 },
  allocatedValue: { ...type.labelBold, color: colors.textPrimary },
  pctText: { ...type.captionMedium, color: colors.textSecondary },

  progressTrack: { height: 12, backgroundColor: colors.surfaceContainer, borderRadius: 6, overflow: 'hidden', marginBottom: spacing.sm },
  progressFill: { height: '100%', borderRadius: 6 },

  bufferRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bufferPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  bufferText: { ...type.captionMedium },
  quickAdd: { ...type.captionMedium, color: colors.primary },

  overbudgetWarning: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.errorTint, borderRadius: 8, padding: 10, marginTop: spacing.sm },
  overbudgetText: { ...type.captionMedium, color: colors.errorDefault, flex: 1 },

  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, marginBottom: 4 },
  itemsTitle: { ...type.labelBold, color: colors.textPrimary },
  itemsHint: { ...type.caption, color: colors.textSecondary },

  itemList: { gap: spacing.sm },

  itemTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  checkbox: { paddingTop: 2 },
  checkboxBox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },

  badgeCostRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  itemBadgeText: { ...type.captionMedium, color: colors.onPrimary, fontWeight: '700' },
  itemCost: { ...type.labelBold, color: colors.textPrimary },
  itemName: { ...type.h2, color: colors.textPrimary },
  itemDesc: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  supplierRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgBase, borderRadius: 8, padding: 8, marginTop: 8 },
  supplierName: { ...type.captionMedium, color: colors.textPrimary },
  supplierPrice: { ...type.caption, color: colors.textSecondary },
  changeBtn: { ...type.captionMedium, color: colors.primary },

  supplierSwitcher: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: 8, marginTop: 8, gap: 6 },
  compareLabel: { ...type.captionMedium, color: colors.textSecondary },
  supplierOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSurface, borderRadius: 4, padding: 8, gap: 8 },
  radioCircle: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: colors.borderDefault, alignItems: 'center', justifyContent: 'center' },
  radioCircleActive: { borderColor: colors.primary },
  radioInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  supplierOptionName: { ...type.captionMedium, color: colors.textPrimary, flex: 1 },
  supplierOptionPrice: { ...type.caption, color: colors.textSecondary },

  accordionToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4, marginTop: 10 },
  accordionLabel: { ...type.captionMedium, color: colors.primary },

  rationaleBox: { backgroundColor: colors.surfaceContainerLow, borderRadius: 8, padding: 10, gap: 6 },
  rationaleUrgent: { ...type.captionMedium, color: colors.errorDefault, flex: 1 },
  rationaleBody: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },

  addCustom: { marginHorizontal: spacing.md, height: 56, borderWidth: 2, borderStyle: 'dashed', borderColor: colors.borderDisabled, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addCustomText: { ...type.labelBold, color: colors.textSecondary },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.bgSurface, paddingHorizontal: spacing.md, paddingTop: spacing.sm, ...shadow.md },
  footerSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  footerCount: { ...type.captionMedium, color: colors.textPrimary },
  footerDot: { color: colors.textSecondary },
  footerTotal: { ...type.labelBold, color: colors.textPrimary },
  footerStatus: { ...type.captionMedium },

  orderBtn: { height: 48, borderRadius: 8, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  orderBtnDisabled: { backgroundColor: colors.borderDisabled, opacity: 0.6 },
  orderBtnDone: { backgroundColor: colors.secondary },
  orderBtnText: { ...type.labelBold, color: colors.onPrimary },
})
