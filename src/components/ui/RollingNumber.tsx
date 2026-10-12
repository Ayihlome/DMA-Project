import React, { useEffect, useMemo, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View, type StyleProp, type TextStyle } from 'react-native'
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

/**
 * How tall one digit is, worked out from the style rather than waiting for a
 * layout event. Scaled by the phone's text-size setting, because React Native
 * scales text (and its line height) by it too.
 */
function lineHeightOf(style: StyleProp<TextStyle>) {
  const flat = StyleSheet.flatten(style) ?? {}
  return flat.lineHeight ?? Math.round((flat.fontSize ?? 14) * 1.25)
}

function Digit({ char, style }: { char: string; style?: StyleProp<TextStyle> }) {
  const reduced = useReducedMotion()
  const { fontScale } = useWindowDimensions()
  const target = Number(char)
  const offset = useSharedValue(target)
  /**
   * Starts from the style's line height so the digit is visible on the very
   * first frame. This used to start hidden at height 0 and wait for onLayout —
   * and where that event never fired (a child of a clipped, zero-height view
   * is exactly where some platforms skip it), the digits stayed invisible for
   * good while the "R" and commas around them showed. onLayout now only
   * corrects the height if the real line differs.
   *
   * `base` goes on the Text, which React Native scales by the text-size
   * setting itself; the window and the roll use the scaled height, which is
   * what's actually drawn. Scaling `base` first would scale it twice.
   */
  const base = lineHeightOf(style)
  const [measured, setMeasured] = useState(0)
  const lineHeight = measured || Math.ceil(base * fontScale)

  useEffect(() => {
    if (reduced) {
      // Reduced motion: still show the right digit, just don't roll to it
      offset.set(target)
      return
    }
    offset.set(withTiming(target, { duration: DURATION.base, easing: EASE_OUT }))
  }, [target, reduced, offset])

  // Always attached, so the strip is positioned from the first frame
  const stripStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -offset.get() * lineHeight }],
  }))

  return (
    <View style={[styles.window, { height: lineHeight }]}>
      <Animated.View style={stripStyle}>
        {DIGITS.map((d, i) => (
          <Text
            key={d}
            style={[styles.char, style, { lineHeight: base }]}
            // Measure once off the first cell; they're all identical
            onLayout={
              i === 0
                ? (e) => {
                    const h = Math.ceil(e.nativeEvent.layout.height)
                    if (h > 0 && h !== measured) setMeasured(h)
                  }
                : undefined
            }
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
  char: {
    // Tabular figures keep every digit the same width, so the strip doesn't
    // jitter sideways as values change
    fontVariant: ['tabular-nums'],
  },
})
