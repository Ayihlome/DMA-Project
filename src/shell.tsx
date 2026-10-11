import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { dashboardKpis, relativeTime } from './core'
import { TABS, isTab, titleOf, useNav } from './nav'
import { useStore } from './store'
import { Avatar, BrandMark, Icon } from './ui'
import { TAP, colors, radius, shadow, space, type } from './theme'

export const HEADER_H = 64
export const NAV_H = 64

/** Re-renders periodically so relative times ("2 min ago") stay current. */
function useTick(ms = 30_000) {
  const [, set] = useState(0)
  useEffect(() => {
    const t = setInterval(() => set((n) => n + 1), ms)
    return () => clearInterval(t)
  }, [ms])
}

/** Reports where data is stored, without blocking work. */
export function SyncStatus({ compact }: { compact?: boolean }) {
  useTick()
  const { online, backupStatus, state } = useStore()
  // "Backed up" is shown only once an upload has actually succeeded, never
  // optimistically off a local queue.
  const view = !online
    ? { icon: 'cloud_off', text: 'Offline · saved on this device', short: 'Offline', bg: colors.warningTint, fg: colors.tertiary }
    : backupStatus === 'backed-up'
      ? { icon: 'cloud_done', text: `Backed up ${relativeTime(state.lastSyncedAt)}`, short: 'Backed up', bg: colors.successTint, fg: colors.secondary }
      : { icon: 'save', text: 'Saved on this device', short: 'On device', bg: colors.accentTint, fg: colors.primary }
  return (
    <View style={[styles.sync, { backgroundColor: view.bg }]} accessible accessibilityLabel={view.text}>
      <Icon name={view.icon} size="xs" color={view.fg} />
      <Text style={[type.captionMedium, { color: view.fg }]} numberOfLines={1}>
        {compact ? view.short : view.text}
      </Text>
    </View>
  )
}

export function Header() {
  const { state } = useStore()
  const { route, navigate, back } = useNav()
  const insets = useSafeAreaInsets()
  const sub = !isTab(route)
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.headerInner}>
        {sub ? (
          <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Go back" style={styles.tap}>
            <Icon name="arrow_back" />
          </Pressable>
        ) : (
          <View style={{ paddingLeft: space.xs }}>
            <BrandMark size="sm" />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.labelBold, { color: colors.textPrimary }]} numberOfLines={1}>
            {state.profile.storeName}
          </Text>
          <Text style={[type.caption, { color: colors.textSecondary }]} numberOfLines={1} accessibilityRole="header">
            {titleOf(route)}
          </Text>
        </View>
        <SyncStatus compact />
        <Pressable
          onPress={() => navigate({ name: 'profile' })}
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          style={[styles.tap, { borderRadius: TAP / 2 }, route.name === 'profile' && styles.ring]}
        >
          <Avatar name={state.profile.ownerName} size="sm" />
        </Pressable>
      </View>
    </View>
  )
}

export function BottomNav() {
  const { route, navigate } = useNav()
  const { state } = useStore()
  const insets = useSafeAreaInsets()
  const attention = dashboardKpis(state).attention.length
  return (
    <View style={[styles.nav, { paddingBottom: insets.bottom }]} accessibilityRole="tablist">
      {TABS.map((t) => {
        const active = route.name === t.name
        const fg = active ? colors.primary : colors.textSecondary
        return (
          <Pressable
            key={t.name}
            onPress={() => navigate({ name: t.name })}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t.name === 'restock' && attention ? `${t.label}, ${attention} items need restocking` : t.label}
            style={[styles.navItem, active && { backgroundColor: colors.accentTint }]}
          >
            <View>
              <Icon name={t.icon} color={fg} />
              {t.name === 'restock' && attention > 0 && (
                <View style={styles.badge}>
                  <Text style={[type.captionMedium, { color: colors.onError, fontSize: 10, lineHeight: 14 }]}>{attention}</Text>
                </View>
              )}
            </View>
            <Text style={[active ? type.labelBold : type.captionMedium, { color: fg, fontSize: 12, lineHeight: 16 }]}>{t.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  sync: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.full },
  header: { backgroundColor: 'rgba(255,255,255,0.96)', ...shadow.sm, zIndex: 10 },
  headerInner: { height: HEADER_H, paddingHorizontal: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.xs },
  tap: { width: TAP, height: TAP, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2, borderColor: colors.primary },
  nav: { backgroundColor: 'rgba(255,255,255,0.98)', flexDirection: 'row', paddingHorizontal: space['2xs'], ...shadow.barUp },
  navItem: {
    flex: 1,
    height: NAV_H - space['2xs'] * 2,
    marginVertical: space['2xs'],
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.errorDefault,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
