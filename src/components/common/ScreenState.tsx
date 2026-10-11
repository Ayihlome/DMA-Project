import React from 'react'
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native'
import { colors, spacing, type } from '../../theme/theme'

/** First load of a screen. */
export function Loading() {
  return (
    <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  )
}

/** The backend call failed. Shows the reason and lets the owner try again. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={{ padding: spacing.md, alignItems: 'center', gap: spacing.xs }}>
      <Text style={[type.body, { color: colors.errorDefault, textAlign: 'center' }]}>{message}</Text>
      <TouchableOpacity onPress={onRetry} accessibilityRole="button">
        <Text style={[type.label, { color: colors.primary }]}>Try again</Text>
      </TouchableOpacity>
    </View>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  return <Text style={[type.caption, { color: colors.textSecondary, textAlign: 'center', padding: spacing.md }]}>{children}</Text>
}
