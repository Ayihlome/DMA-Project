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
          <View style={styles.nameRow}>
            <Text style={styles.shopName}>Bongani Spaza</Text>
            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Synced</Text>
            </View>
          </View>
          <Text style={styles.screenLabel}>{screenLabel}</Text>
        </View>
        <TouchableOpacity
          style={styles.avatar}
          onPress={() => confirmSignOut(signOut)}
          activeOpacity={0.7}
          accessibilityLabel="Sign out"
        >
          <MaterialIcons name="person" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderDefault,
  },
  inner: {
    height: 56,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  shopName: { ...type.labelBold, color: colors.textPrimary },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.successTint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.secondary },
  syncText: { ...type.captionMedium, color: colors.secondary },
  screenLabel: { ...type.caption, color: colors.textSecondary },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
