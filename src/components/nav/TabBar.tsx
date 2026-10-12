import React, { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import type { BottomTabBarProps } from 'expo-router/tabs'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcon from '../common/MaterialIcon'
import { colors, DURATION, fonts } from '../../theme/tokens'

/**
 * The five main tabs, in order. Keyed by route file name: the routes keep
 * their original names (`sales`, `supply`…) so existing links still work, and
 * only the labels follow the spec.
 */
const TABS: { route: string; label: string; icon: string }[] = [
  { route: 'index', label: 'Home', icon: 'home' },
  { route: 'sales', label: 'Sell', icon: 'shopping_cart' },
  { route: 'supply', label: 'Prices', icon: 'sell' },
  { route: 'restock', label: 'Restock', icon: 'inventory_2' },
  { route: 'profile', label: 'Profile', icon: 'person' },
]

/** Spec: height 70, left/right 14, bottom 22, radius 26. */
const BAR_HEIGHT = 70
const SIDE = 14
const BOTTOM = 22
/**
 * Inner padding around the active tile. 26 (bar) - 6 = 20, which is exactly
 * the spec's tile radius, so the tile's corners sit concentric with the bar's.
 */
const INSET = 6
const ICON = 22

const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1)

/**
 * How far up from the bottom the bar reaches, plus breathing room. Scroll
 * content on every tab screen needs at least this much bottom padding — the
 * bar floats over the screen, and React Navigation doesn't pad for a custom bar.
 */
export function useTabBarSpace() {
  const insets = useSafeAreaInsets()
  return barBottom(insets.bottom) + BAR_HEIGHT + 28
}

/**
 * Spec says 22 from the bottom, but on a phone with a home indicator that puts
 * the bar on top of it. Sit above whichever is higher.
 */
function barBottom(insetBottom: number) {
  return Math.max(BOTTOM, insetBottom)
}

/**
 * The floating tab bar: a white pill with five equal tabs, the active one a
 * black tile with a yellow icon and label.
 *
 * Passed to Expo Router's `<Tabs tabBar={…}>`, so it gets React Navigation's
 * own state and navigation — tab presses emit `tabPress` like the stock bar,
 * which keeps tap-to-scroll-to-top and listeners working.
 *
 * Motion: the screen switches instantly (tabs never slide — they're peers),
 * but the black tile glides to the new tab in 200ms. The yellow isn't a colour
 * change on each tab. The tile carries its own yellow copy of the whole row,
 * shifted the opposite way so it lines up with the black row underneath, and
 * clipped to the tile. So the yellow travels *with* the tile instead of jumping
 * ahead of it, and every frame is a transform on the UI thread.
 */
export default function TabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const [track, setTrack] = useState({ width: 0, height: 0 })

  // Only the five main tabs, in spec order, and only those that exist as routes
  const tabs = TABS.map((t) => ({ ...t, r: state.routes.find((r) => r.name === t.route) })).filter(
    (t): t is typeof t & { r: NonNullable<typeof t.r> } => !!t.r,
  )
  const focusedKey = state.routes[state.index]?.key
  const active = Math.max(
    0,
    tabs.findIndex((t) => t.r.key === focusedKey),
  )

  const cell = tabs.length ? track.width / tabs.length : 0
  const x = useSharedValue(0)
  const measured = useRef(false)

  useEffect(() => {
    if (!cell) return
    if (!measured.current) {
      // First layout, or the bar was resized: jump into place, don't glide in
      x.set(active * cell)
      measured.current = true
      return
    }
    x.set(
      withTiming(active * cell, {
        duration: DURATION.base,
        easing: EASE_IN_OUT,
        reduceMotion: ReduceMotion.System,
      }),
    )
  }, [active, cell, x])

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout
    if (width === track.width && height === track.height) return
    measured.current = false
    setTrack({ width, height })
  }

  const tileStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  const counterStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -x.get() }] }))

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom: barBottom(insets.bottom) }]}
    >
      <View style={styles.bar}>
        <View style={styles.track} onLayout={onTrackLayout} accessibilityRole="tablist">
          {/* Base row: black glyphs, and the real touch targets */}
          {tabs.map((t, i) => {
            const focused = i === active
            const { options } = descriptors[t.r.key]

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: t.r.key,
                canPreventDefault: true,
              })
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(t.r.name, t.r.params)
              }
            }

            return (
              <Pressable
                key={t.r.key}
                onPress={onPress}
                onLongPress={() => navigation.emit({ type: 'tabLongPress', target: t.r.key })}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={options.tabBarAccessibilityLabel ?? t.label}
                style={styles.cell}
              >
                <Glyph icon={t.icon} label={t.label} color={colors.ink} />
              </Pressable>
            )
          })}

          {/* The tile, with its clipped yellow copy of the row */}
          {cell > 0 ? (
            <Animated.View
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={[styles.tile, { width: cell, height: track.height }, tileStyle]}
            >
              <Animated.View style={[styles.row, { width: track.width }, counterStyle]}>
                {tabs.map((t) => (
                  <View key={t.r.key} style={[styles.cell, { width: cell }]}>
                    <Glyph icon={t.icon} label={t.label} color={colors.brand} />
                  </View>
                ))}
              </Animated.View>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </View>
  )
}

function Glyph({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <>
      <MaterialIcon name={icon} size={ICON} color={color} />
      <Text
        style={[styles.label, { color }]}
        numberOfLines={1}
        // 11px labels in a fixed-height bar: let them grow for large text,
        // but not so far that they overflow the pill
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
    </>
  )
}

const styles = StyleSheet.create({
  // Full-width and centred, so the pill caps out on a wide web window
  wrap: { position: 'absolute', left: SIDE, right: SIDE, alignItems: 'center' },
  bar: {
    width: '100%',
    maxWidth: 560,
    height: BAR_HEIGHT,
    padding: INSET - 1, // the 1px border sits inside the 70
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E6E6E1',
    borderRadius: 26,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  track: { flex: 1, flexDirection: 'row' },
  row: { flexDirection: 'row', height: '100%' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tile: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 20,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  label: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14 },
})
