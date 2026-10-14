import { StyleSheet } from 'react-native'
import { colors, radius, space, type } from '../../theme/tokens'

/**
 * Auth styles, rebuilt on the STOCK_EVO_DESIGN.md tokens. The screen chrome now
 * lives in AuthShell; what's left here is the form body, messages and links.
 */
export const styles = StyleSheet.create({
  form: { gap: space.md },

  // Messages sit above the fields. Both carry an icon-free tinted block: the
  // colour is backed by the wording, never the only signal.
  error: {
    ...type.bodyStrong,
    color: colors.danger,
    backgroundColor: '#FDECEA',
    padding: space.lg,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  notice: {
    ...type.bodyStrong,
    color: colors.ink,
    backgroundColor: colors.brandSoft,
    padding: space.lg,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },

  switchRow: { flexDirection: 'row', justifyContent: 'center', gap: space.xs },
  switchText: { ...type.body, color: colors.muted },
  switchLink: { ...type.bodyStrong, color: colors.ink, textDecorationLine: 'underline' },

  // Consent row on Create account
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  consentText: { ...type.caption, color: colors.muted, flex: 1 },
  consentLink: { ...type.caption, color: colors.ink, textDecorationLine: 'underline' },
})
