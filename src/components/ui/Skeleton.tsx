import React from 'react'
import { type DimensionValue, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { css, useReducedMotion } from 'react-native-reanimated'
import { radius as radii } from '../../theme/tokens'

/**
 * A placeholder block — React Native's stand-in for SwiftUI's
 * `.redacted(reason: .placeholder)`.
 *
 * SwiftUI can redact a real view tree automatically; React Native can't, so a
 * skeleton is the real layout rebuilt with these blocks in place of text and
 * controls. Size each block to the content it stands in for, so nothing jumps
 * when the real thing arrives.
 *
 * The pulse is 900ms each way, deliberately not the app's 200ms. That number is
 * for transitions, which play once; a loop running at 200ms alternates five
 * times a second and reads as strobing, not as "loading". Under Reduce Motion
 * it holds still, which is also SwiftUI's default for redacted content.
 */
export default function Skeleton({
  width = '100%',
  height = 14,
  radius = radii.sm / 2,
  tone = 'light',
  style,
}: {
  width?: DimensionValue
  height?: number
  radius?: number
  /** `light` on white, field-grey and yellow surfaces; `dark` on black or coloured fills. */
  tone?: 'light' | 'dark'
  style?: StyleProp<ViewStyle>
}) {
  const reduced = useReducedMotion()

  return (
    <Animated.View
      // Decorative: whatever contains the skeleton announces that it's loading
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.block,
        tone === 'dark' ? styles.onDark : styles.onLight,
        !reduced && styles.pulse,
        { width, height, borderRadius: radius },
        style,
      ]}
    />
  )
}

const pulse = css.keyframes({
  from: { opacity: 1 },
  to: { opacity: 0.45 },
})

const styles = css.create({
  block: { overflow: 'hidden' },
  // Ink at 8% rather than a fixed grey, so one tone reads on white, on the
  // field grey and on the yellow header alike
  onLight: { backgroundColor: 'rgba(17,17,17,0.08)' },
  onDark: { backgroundColor: 'rgba(255,255,255,0.32)' },
  pulse: {
    animationName: pulse,
    animationDuration: '900ms',
    animationDirection: 'alternate',
    animationIterationCount: 'infinite',
    animationTimingFunction: 'ease-in-out',
  },
})
