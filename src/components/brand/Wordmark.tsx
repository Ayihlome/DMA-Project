import React from 'react'
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native'
import { colors, type } from '../../theme/tokens'

/** "stock evo" — 30 / 800, letter-spacing -0.8, always lowercase. */
export default function Wordmark({
  color = colors.ink,
  size,
  style,
}: {
  color?: string
  size?: number
  style?: StyleProp<TextStyle>
}) {
  return (
    <Text
      style={[styles.text, { color }, size != null && { fontSize: size, lineHeight: size * 1.2 }, style]}
      // Read as one word, not two, and never scaled out of the header
      accessibilityRole="header"
      allowFontScaling={false}
    >
      stock evo
    </Text>
  )
}

const styles = StyleSheet.create({
  text: { ...type.wordmark },
})
