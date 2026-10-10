import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type, card } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { padding: spacing.md, gap: spacing.md },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center', gap: spacing.md },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  addText: { ...type.bodyMedium, color: colors.onPrimary },

  list: { ...card.base, padding: 0, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
  },
  rowFirst: { borderTopWidth: 0 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, minWidth: 0 },
  rowName: { ...type.bodyMedium, color: colors.textPrimary },
  rowMeta: { ...type.caption, color: colors.textSecondary },
  rowStatus: { ...type.label, color: colors.textSecondary, textAlign: 'right' },
  rowWarn: { color: colors.warningDefault },

  hint: { ...type.label, color: colors.textSecondary },

  label: { ...type.captionMedium, color: colors.textSecondary, marginBottom: -spacing.xs / 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { ...type.label, color: colors.textPrimary },
  chipTextActive: { color: colors.onPrimary },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  switchLabel: { ...type.label, color: colors.textPrimary },
  switchHint: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  errorText: {
    ...type.label,
    color: colors.errorDefault,
    backgroundColor: colors.errorTint,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  saveBtn: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { ...type.bodyMedium, color: colors.onPrimary },
})
