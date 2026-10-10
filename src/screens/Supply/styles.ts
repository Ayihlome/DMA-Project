import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  itemIcon: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  itemName: { ...type.bodyMedium, color: colors.textPrimary },
  itemPack: { ...type.caption, color: colors.textSecondary },

  summary: { ...type.body, color: colors.textPrimary, marginVertical: spacing.md },
  summaryStrong: { fontWeight: '700' },

  list: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, minHeight: 72 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDefault },
  rowSelected: { backgroundColor: colors.accentTint },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderDisabled, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  supplierName: { ...type.bodyMedium, color: colors.textPrimary },
  supplierMeta: { ...type.caption, color: colors.textSecondary, marginTop: 2 },
  supplierNote: { ...type.captionMedium, color: colors.warningDefault, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { ...type.h2, color: colors.textPrimary },
  priceDiff: { ...type.captionMedium, color: colors.textSecondary },

  listNote: { ...type.caption, color: colors.textSecondary, marginTop: spacing.xs },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48, marginTop: spacing.sm },
  addText: { ...type.labelBold, color: colors.primary },

  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: colors.bgBase,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  actionBtnDone: { backgroundColor: colors.secondary },
  actionText: { ...type.bodyMedium, fontWeight: '700', color: colors.onPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  modalTitle: { ...type.h2, color: colors.textPrimary },
  modalClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputLabel: { ...type.captionMedium, color: colors.textSecondary },
  input: {
    ...type.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
    marginBottom: spacing.xs,
  },
})
