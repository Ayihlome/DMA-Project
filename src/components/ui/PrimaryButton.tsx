import React, { type ReactNode } from 'react'
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { BUTTON_HEIGHT, colors, radius, type } from '../../theme/tokens'
import PressableScale from './PressableScale'
import Skeleton from './Skeleton'

/**
 * Black primary button — 58px tall, radius 16, 16/700 white label.
 *
 * While busy, the label is redacted — swapped for a pulsing bar — rather than
 * replaced by a spinner. The label stays mounted underneath at zero opacity,
 * so the button keeps its exact width and the form doesn't jump.
 */
export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  tone = 'ink',
  height = BUTTON_HEIGHT,
  style,
  accessibilityLabel,
  children,
}: {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  /** `ink` is the default; `brand` is the yellow variant for POS actions. */
  tone?: 'ink' | 'brand'
  /** Spec allows 58–64; 58 by default, 64 for a screen's one main action. */
  height?: number
  style?: StyleProp<ViewStyle>
  accessibilityLabel?: string
  /**
   * Replaces the text label, for a label that has to animate (rolling
   * numerals). `label` is still the accessible name.
   */
  children?: ReactNode
}) {
  const off = disabled || loading
  const onBrand = tone === 'brand'

  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: off }}
      containerStyle={style}
      style={[
        styles.button,
        { height },
        onBrand && styles.brand,
        // Disabled keeps the shape and drops the fill, rather than going
        // translucent and letting the background show through the text
        disabled && styles.disabled,
      ]}
    >
      {/* Both layers stay mounted so the button's width never changes */}
      <View style={[styles.labelRow, loading && styles.labelHidden]}>
        {children ?? (
          <Text
            style={[styles.label, onBrand && styles.labelOnBrand, disabled && styles.labelDisabled]}
            numberOfLines={1}
          >
            {label}
          </Text>
        )}
      </View>
      {loading ? (
        <View style={styles.redacted} pointerEvents="none">
          {/* Dark tone on the black button, light on the yellow one */}
          <Skeleton width="38%" height={12} radius={6} tone={onBrand ? 'light' : 'dark'} />
        </View>
      ) : null}
    </PressableScale>
  )
}

const styles = StyleSheet.create({
  button: {
    height: BUTTON_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: { backgroundColor: colors.brand },
  disabled: { backgroundColor: colors.disabled },
  labelRow: { flexDirection: 'row', alignItems: 'center' },
  label: { ...type.button, color: colors.surface },
  labelOnBrand: { color: colors.ink },
  labelDisabled: { color: colors.muted },
  labelHidden: { opacity: 0 },
  redacted: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
