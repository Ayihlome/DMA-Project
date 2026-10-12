import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { DURATION } from '../../theme/tokens'

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

/**
 * Rolling numerals — React Native's answer to SwiftUI's
 * `.contentTransition(.numericText())`.
 *
 * Each digit is a vertical strip of 0-9 translated to show the right one, so a
 * change rolls the strip rather than swapping the glyph. Built this way rather
 * than with layout animations on purpose:
 *
 *   - it's pure `transform`, so it runs on the UI thread and never triggers a
 *     layout pass
 *   - nothing mounts or unmounts as the value changes, so rapid updates (a qty
 *     stepper held down) retarget smoothly instead of restarting
 *   - it behaves identically on web, where layout animations are patchier
 *
 * Takes an already-formatted string, so currency formatting, grouping and
 * decimals stay in one place (`money()`), and non-digit characters — R, comma,
 * thousands space — render statically.
 */
export default function RollingNumber({
  value,
  style,
  accessibilityLabel,
}: {
  /** Pre-formatted, e.g. `money(81)` → "R81,00". */
  value: string
  style?: StyleProp<TextStyle>
  accessibilityLabel?: string
}) {
  const chars = useMemo(() => value.split(''), [value])

  return (
    // The whole value is one accessible string; the per-digit strips are
    // decorative and must not be read out one at a time.
    <View
      style={styles.row}
      accessible
      accessibilityLabel={accessibilityLabel ?? value}
      accessibilityRole="text"
    >
      {chars.map((ch, i) =>
        /\d/.test(ch) ? (
          // Keyed by position, not by character: the strip at a given place
          // must persist across value changes for it to roll rather than remount.
          <Digit key={`d${i}`} char={ch} style={style} />
        ) : (
          <Text key={`s${i}-${ch}`} style={[styles.char, style]}>
            {ch}
          </Text>
        ),
      )}
    </View>
  )
}

function Digit({ char, style }: { char: string; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion()
  const target = Number(char)
  const offset = useSharedValue(target)
  // Measured, not assumed — font scaling makes any constant wrong
  const [lineHeight, setLineHeight] = useState(0)

  useEffect(() => {
    if (reduced) {
      // Reduced motion: still show the right digit, just don't roll to it
      offset.set(target)
      return
    }
    offset.set(withTiming(target, { duration: DURATION.base, easing: EASE_OUT }))
  }, [target, reduced, offset])

  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.get() * lineHeight }],
  }))

  return (
    <View style={[styles.window, lineHeight > 0 ? { height: lineHeight } : styles.measuring]}>
      <Animated.View style={lineHeight > 0 ? stripStyle : undefined}>
        {DIGITS.map((d, i) => (
          <Text
            key={d}
            style={[styles.char, style]}
            // Measure once off the first cell; they're all identical
            onLayout={i === 0 ? (e) => setLineHeight(e.nativeEvent.layout.height) : undefined}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, minWidth: 0 },
  // Clips the strip down to a single digit
  window: { overflow: 'hidden' },
  measuring: { opacity: 0, height: 0 },
  char: {
    // Tabular figures keep every digit the same width, so the strip doesn't
    // jitter sideways as values change
    fontVariant: ['tabular-nums'],
  },
})
