import React from 'react'
import { StyleSheet, View } from 'react-native'
import Skeleton from '../../components/ui/Skeleton'
import { BUTTON_HEIGHT, colors, radius, space } from '../../theme/tokens'
import AuthShell, { HEADER_COMPACT } from './AuthShell'

/**
 * Shown while the shop's data loads after signing in or verifying an email —
 * where the app used to show a spinner.
 *
 * It is onboarding's first step with the content redacted, because that is
 * where a newly verified account lands next. The yellow header and logo stay
 * real: they're identical on both sides of the load, so redacting them would
 * only make them flicker. Every block is sized to the thing it stands in for,
 * so when onboarding appears nothing moves — the shapes just fill in.
 *
 * Returning users coming from Sign in pass through here too. Sign in uses the
 * same shell, so it still reads as that screen loading, not as a jump to an
 * unrelated one.
 */
export default function AuthSkeleton() {
  return (
    <View
      style={styles.root}
      accessible
      accessibilityLabel="Loading your shop"
      accessibilityState={{ busy: true }}
    >
      <AuthShell
        headerHeight={HEADER_COMPACT}
        footer={
          <View style={styles.footer}>
            {/* Step dots: the first is the long "current" one */}
            <View style={styles.dots}>
              <Skeleton width={20} height={8} radius={4} />
              <Skeleton width={8} height={8} radius={4} />
              <Skeleton width={8} height={8} radius={4} />
            </View>
            <Skeleton height={BUTTON_HEIGHT} radius={radius.md} />
            <View style={styles.links}>
              <View />
              <Skeleton width={150} height={13} />
            </View>
          </View>
        }
      >
        {/* Title, then a two-line subtitle */}
        <View style={styles.heading}>
          <Skeleton width="62%" height={26} radius={6} />
          <View style={styles.subtitle}>
            <Skeleton width="96%" height={14} />
            <Skeleton width="70%" height={14} />
          </View>
        </View>

        {/* The pack cards, two per row */}
        <View style={styles.grid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.cardSlot}>
              <View style={styles.card}>
                <Skeleton width={26} height={26} radius={8} />
                <Skeleton width="70%" height={15} style={styles.cardLabel} />
                <Skeleton width="92%" height={11} />
                <Skeleton width="60%" height={11} />
                <Skeleton width={64} height={11} style={styles.cardCount} />
              </View>
            </View>
          ))}
        </View>
      </AuthShell>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  heading: { gap: space.sm },
  subtitle: { gap: space.xs + 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cardSlot: { width: '48%', flexGrow: 1 },
  card: {
    padding: space.lg,
    gap: space.xs + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 132,
  },
  cardLabel: { marginTop: space.xs },
  cardCount: { marginTop: 'auto' },
  footer: { gap: space.lg },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: space.sm },
  links: { flexDirection: 'row', justifyContent: 'space-between' },
})
