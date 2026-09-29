import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import { colors, spacing, type } from '../../theme/theme'

interface Props {
  screenLabel: string
}

export default function AppHeader({ screenLabel }: Props) {
  const insets = useSafeAreaInsets()

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
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={18} color={colors.onPrimary} />
        </View>
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
