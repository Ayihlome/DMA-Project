import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import { colors, spacing, type } from '../../theme/theme'
import { useAuth } from '../../providers/AuthProvider'

interface Props {
  screenLabel: string
}

function confirmSignOut(signOut: () => void) {
  if (Platform.OS === 'web') {
    // Alert buttons aren't supported on web
    if (window.confirm('Sign out of Bongani Spaza?')) signOut()
    return
  }
  Alert.alert('Sign out', 'Sign out of Bongani Spaza?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: signOut },
  ])
}

export default function AppHeader({ screenLabel }: Props) {
  const insets = useSafeAreaInsets()
  const { signOut } = useAuth()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.inner}>
        <View style={styles.left}>
          <Text style={styles.shopName}>Bongani Spaza</Text>
          <Text style={styles.screenLabel}>{screenLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.signOut}
          onPress={() => confirmSignOut(signOut)}
          activeOpacity={0.7}
          accessibilityLabel="Sign out"
        >
          <MaterialIcons name="person" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bgBase,
  },
  inner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1, minWidth: 0 },
  shopName: { ...type.captionMedium, color: colors.textSecondary },
  screenLabel: { ...type.display, color: colors.textPrimary },
  signOut: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
