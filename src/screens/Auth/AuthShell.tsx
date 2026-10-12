import React, { type ReactNode } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Logo from '../../components/brand/Logo'
import Wordmark from '../../components/brand/Wordmark'
import { colors, radius, space, type } from '../../theme/tokens'

/** Spec: 290px header, 230 on Create account (it has more fields to fit). */
export const HEADER_TALL = 290
export const HEADER_SHORT = 230
/** Create account now has five fields and a consent row, so it goes shorter still. */
export const HEADER_COMPACT = 186

/**
 * The shared chrome for all three auth screens.
 *
 * The two 56px curves are the whole idea, and they only read correctly because
 * of the split background behind them:
 *
 *   - the background is left-half white, right-half yellow
 *   - the yellow header's rounded bottom-left corner cuts away yellow, showing
 *     the white half beneath it
 *   - the white panel's rounded top-right corner cuts away white, showing the
 *     yellow half
 *
 * Together they read as one continuous S-curve across the screen. Remove the
 * split background and both corners reveal the wrong colour.
 */
export default function AuthShell({
  headerHeight = HEADER_TALL,
  children,
  footer,
}: {
  headerHeight?: number
  children: ReactNode
  /** Segmented pill or switch link, pinned under the form. */
  footer?: ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.root}>
      {/* Split background. Sits behind everything so both curves have the
          opposite colour to reveal. */}
      <View style={styles.split} pointerEvents="none">
        <View style={styles.splitWhite} />
        <View style={styles.splitYellow} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          // The header bleeds under the status bar, so it must not be inset
          contentInsetAdjustmentBehavior="never"
        >
          <View
            style={[styles.header, { height: headerHeight + insets.top, paddingTop: insets.top }]}
          >
            <Logo size={84} stroke={colors.ink} />
            <Wordmark color={colors.ink} />
          </View>

          <View style={[styles.panel, { paddingBottom: space.xxl + insets.bottom }]}>
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

/** Screen title + supporting line at the top of the white panel. */
export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.heading}>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  split: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  splitWhite: { flex: 1, backgroundColor: colors.surface },
  splitYellow: { flex: 1, backgroundColor: colors.brand },

  // grow, not flex:1 — the panel has to be able to exceed the screen when the
  // keyboard is up, or the fields become unreachable
  scroll: { flexGrow: 1 },

  header: {
    backgroundColor: colors.brand,
    borderBottomLeftRadius: radius.panel,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },

  panel: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopRightRadius: radius.panel,
    paddingTop: 44,
    paddingHorizontal: 28,
    gap: space.lg,
  },

  heading: { gap: space.xs },
  title: { ...type.title, color: colors.ink },
  subtitle: { ...type.body, color: colors.muted },

  footer: { marginTop: 'auto', paddingTop: space.xl },
})
