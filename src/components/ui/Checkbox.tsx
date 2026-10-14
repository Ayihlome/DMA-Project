import React from 'react'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import MaterialIcons from '../common/MaterialIcon'
import { colors, DURATION, radius } from '../../theme/tokens'
import PressableScale from './PressableScale'

/**
 * Consent checkbox. Ticked = brand yellow with ink check.
 *
 * The tick fades and scales in over 150ms rather than appearing instantly:
 * it's a once-per-signup interaction, and an element snapping into existence
 * reads as a glitch. It starts at 0.8 rather than 0 — nothing in the real
 * world appears from nothing.
 */
export default function Checkbox({
  checked,
  onToggle,
  accessibilityLabel,
}: {
  checked: boolean
  onToggle: () => void
  accessibilityLabel: string
}) {
  return (
    <PressableScale
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.box, checked && styles.boxOn]}
    >
      <Animated.View style={[styles.tick, checked && styles.tickOn]}>
        <MaterialIcons name="check" size={16} color={colors.ink} />
      </Animated.View>
      {/* Holds the box open at its full size while the tick is hidden */}
      <View style={styles.spacer} />
    </PressableScale>
  )
}

/**
 * Keyword easings here, not EASE_OUT. These styles are handed to
 * PressableScale's `style` prop, which is typed as a plain ViewStyle, and
 * Reanimated's easing objects only fit its own `css.create` styles. `ease` is
 * the right curve for a colour change regardless, and `ease-out` is a fair
 * stand-in for the tick.
 */
const styles = StyleSheet.create({
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.sm - 4,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    // Includes transform: this style goes into PressableScale, and a
    // transitionProperty here replaces its own — leaving transform out made
    // the press scale snap instead of animate
    transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
    transitionDuration: [`${DURATION.press}ms`, `${DURATION.base}ms`, `${DURATION.base}ms`],
    transitionTimingFunction: ['ease-out', 'ease', 'ease'],
  },
  boxOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  tick: {
    position: 'absolute',
    opacity: 0,
    transform: [{ scale: 0.8 }],
    transitionProperty: 'opacity, transform',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease-out',
  },
  tickOn: { opacity: 1, transform: [{ scale: 1 }] },
  spacer: { width: 20, height: 20 },
})
