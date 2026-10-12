import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native'
import Animated from 'react-native-reanimated'
import { colors, INPUT_HEIGHT, radius, space, type } from '../../theme/tokens'

/**
 * Borderless filled input. Per the spec the **placeholder is the label**, so
 * there is no text above the field.
 *
 * That makes `accessibilityLabel` load-bearing rather than decorative: a
 * placeholder disappears the moment the field has content, so without the
 * explicit label a screen reader would announce a filled field as unnamed.
 *
 * The 2px border is always present and merely changes colour on focus. A border
 * that appears on focus would change the field's height and reflow the form.
 */
export default function FilledInput({
  label,
  hint,
  style,
  onFocus,
  onBlur,
  ...props
}: Omit<TextInputProps, 'placeholder'> & {
  /** Shown as the placeholder, and announced as the field's name. */
  label: string
  /** Optional caption under the field, for rules the label can't carry. */
  hint?: string
}) {
  const [focused, setFocused] = useState(false)

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          {...props}
          placeholder={label}
          placeholderTextColor={colors.muted}
          accessibilityLabel={label}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true)
            onFocus?.(e)
          }}
          onBlur={(e) => {
            setFocused(false)
            onBlur?.(e)
          }}
        />
      </Animated.View>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  field: {
    backgroundColor: colors.field,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    justifyContent: 'center',
    transitionProperty: 'borderColor',
    transitionDuration: '200ms',
    transitionTimingFunction: 'ease',
  },
  fieldFocused: { borderColor: colors.brandSoft },
  input: {
    ...type.body,
    color: colors.ink,
    // The border is inside the 58px, so the text box is 54 and the field reads
    // at the spec'd height.
    height: INPUT_HEIGHT - 4,
    paddingHorizontal: space.lg,
    // Android centres single-line text oddly without this
    paddingVertical: 0,
  },
  hint: {
    ...type.caption,
    color: colors.muted,
    paddingHorizontal: space.xs,
  },
})
