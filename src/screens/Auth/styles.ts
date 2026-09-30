import { StyleSheet } from 'react-native'
import { colors, spacing, radius, type, card } from '../../theme/theme'

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center' },

  brand: { alignItems: 'center', marginBottom: spacing.lg, gap: spacing.xs },
  logo: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: { ...type.h1, color: colors.textPrimary },
  subtitle: { ...type.label, color: colors.textSecondary, textAlign: 'center' },

  card: { ...card.base, gap: spacing.md, padding: spacing.lg },
  title: { ...type.h2, color: colors.textPrimary },

  field: { gap: spacing.xs2 },
  label: { ...type.captionMedium, color: colors.textSecondary },
  input: {
    ...type.body,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },

  error: {
    ...type.label,
    color: colors.errorDefault,
    backgroundColor: colors.errorTint,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  notice: {
    ...type.label,
    color: colors.secondary,
    backgroundColor: colors.successTint,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { ...type.bodyMedium, color: colors.onPrimary },

  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, gap: 4 },
  switchText: { ...type.label, color: colors.textSecondary },
  switchLink: { ...type.labelBold, color: colors.primary },
})
