import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.xs },

  salesCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  salesLabel: { ...type.label, color: colors.onPrimaryContainer, opacity: 0.85 },
  salesValue: { fontSize: 40, lineHeight: 46, fontWeight: '700', color: colors.onPrimary, marginTop: 4 },
  salesChange: { ...type.label, color: colors.onPrimaryContainer, opacity: 0.85, marginTop: 4 },

  statRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
  },
  statLabel: { ...type.label, color: colors.textSecondary },
  statValue: { ...type.h1, color: colors.textPrimary, marginTop: 4 },
  statNote: { ...type.caption, color: colors.textSecondary, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.xs },
  sectionTitle: { ...type.h2, color: colors.textPrimary },
  sectionNote: { ...type.label, color: colors.errorDefault },

  list: {
    backgroundColor: colors.bgSurface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, paddingRight: spacing.md, gap: spacing.sm, minHeight: 64 },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderDefault },
  levelBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  rowIcon: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.accentTint, alignItems: 'center', justifyContent: 'center' },
  rowInfo: { flex: 1, minWidth: 0 },
  rowName: { ...type.bodyMedium, color: colors.textPrimary },
  rowSize: { ...type.caption, color: colors.textSecondary },
  rowRight: { alignItems: 'flex-end' },
  rowLeft: { ...type.bodyMedium, fontWeight: '700' },
  rowUnit: { ...type.caption, color: colors.textSecondary },

  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 48, marginTop: spacing.xs },
  linkText: { ...type.labelBold, color: colors.primary },

  footnote: { ...type.caption, color: colors.textSecondary, textAlign: 'center' },

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
  },
  actionText: { ...type.bodyMedium, fontWeight: '700', color: colors.onPrimary },
})
