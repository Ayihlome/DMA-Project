import React, { useState, type ReactNode } from 'react'
import { Pressable, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { css } from 'react-native-reanimated'
import { DURATION, EASE_OUT } from '../../theme/tokens'

/**
 * Press feedback for every pressable in the redesign.
 *
 * 120ms / 3% is the ceiling for something touched this often — it has to be
 * near-imperceptible to survive being seen hundreds of times a day. A CSS
 * transition is the whole implementation: there's no gesture here, so a shared
 * value would be overkill. `setState` fires twice per press, not per frame.
 */
export default function PressableScale({
  onPress,
  onLongPress,
  disabled,
  style,
  containerStyle,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  hitSlop = 8,
}: {
  onPress?: () => void
  onLongPress?: () => void
  disabled?: boolean
  /** Visual style — goes on the scaling view. */
  style?: StyleProp<ViewStyle>
  /** Layout style (flex, alignSelf, width) — goes on the Pressable itself. */
  containerStyle?: StyleProp<ViewStyle>
  children: ReactNode
  accessibilityLabel?: string
  accessibilityRole?: 'button' | 'checkbox' | 'tab' | 'link'
  accessibilityState?: { checked?: boolean; selected?: boolean; disabled?: boolean }
  hitSlop?: number
}) {
  const [pressed, setPressed] = useState(false)

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={disabled}
      hitSlop={hitSlop}
      // A finger drifting a few pixels shouldn't cancel a press the user meant
      pressRetentionOffset={16}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={containerStyle}
    >
      <Animated.View style={[styles.base, style, pressed && !disabled && styles.pressed]}>
        {children}
      </Animated.View>
    </Pressable>
  )
}

/**
 * `css.create`, not `StyleSheet.create`. Reanimated's CSS transitions need its
 * own easing object — a CSS `cubic-bezier(...)` string throws on native — and
 * React Native's `ViewStyle` types `transitionTimingFunction` as a string, so
 * only Reanimated's factory accepts it.
 */
const styles = css.create({
  base: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: EASE_OUT,
  },
  pressed: { transform: [{ scale: 0.97 }] },
})
