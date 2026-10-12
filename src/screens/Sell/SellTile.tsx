import React, { useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { css } from 'react-native-reanimated'
import RollingNumber from '../../components/ui/RollingNumber'
import { colors, DURATION, EASE_OUT, fonts, tabular } from '../../theme/tokens'
import type { Tile } from './sellModel'

/** Spec: tile height 82, radius 16, 1.5px border. */
export const TILE_HEIGHT = 82
/** Spec: hold ~450ms to start repeating. */
export const HOLD_MS = 450

/**
 * One tile on the Sell grid.
 *
 * Tap adds (or opens a picker — the screen decides). Hold for 450ms and the
 * screen starts adding the last-used item on a repeat until release. The tap
 * React Native would deliver after a long press is swallowed: Pressable
 * already skips it when onLongPress fired, and `held` guards it explicitly in
 * case a platform doesn't.
 *
 * Out-of-stock tiles look exactly like the rest. A sale is never refused for
 * stock, so the grid doesn't hint that it might be.
 */
export default function SellTile({
  tile,
  emoji,
  title,
  subtitle,
  qty,
  onTap,
  onHoldStart,
  onHoldEnd,
}: {
  tile: Tile
  /** The picture — recognised before the name is read. */
  emoji: string
  title: string
  subtitle: string
  /** Badge: how many of this tile (or family) are in the sale. */
  qty: number
  onTap: () => void
  onHoldStart: () => void
  onHoldEnd: () => void
}) {
  const [pressed, setPressed] = useState(false)
  const held = useRef(false)
  const quick = tile.kind === 'quick'

  return (
    <Pressable
      onPressIn={() => {
        held.current = false
        setPressed(true)
      }}
      onPressOut={() => {
        setPressed(false)
        if (held.current) onHoldEnd()
      }}
      onPress={() => {
        if (held.current) return
        onTap()
      }}
      onLongPress={() => {
        held.current = true
        onHoldStart()
      }}
      delayLongPress={HOLD_MS}
      // A thumb drifting a little mid-hold shouldn't cancel the repeat
      pressRetentionOffset={20}
      accessibilityRole="button"
      accessibilityLabel={`${title}${qty ? `, ${qty} in sale` : ''}`}
      accessibilityHint="Tap to add. Hold to keep adding the last one sold."
      style={styles.hit}
    >
      <Animated.View style={[motion.tile, styles.tile, quick && styles.quick, pressed && motion.pressed]}>
        <Text style={styles.emoji} maxFontSizeMultiplier={1.15} accessibilityElementsHidden importantForAccessibility="no">
          {emoji}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.subtitle, quick && styles.subtitleQuick]} numberOfLines={1}>
          {subtitle}
        </Text>

        {qty > 0 ? (
          <View style={styles.badge} pointerEvents="none">
            <RollingNumber value={String(qty)} style={styles.badgeText} />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  )
}

/**
 * Only the scaling view goes through Reanimated's css.create — its easing is a
 * Reanimated object that React Native's own style types won't accept. Every
 * other style is a plain StyleSheet, because Pressable and Text take those.
 */
const motion = css.create({
  tile: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: EASE_OUT,
  },
  pressed: { transform: [{ scale: 0.96 }] },
})

const styles = StyleSheet.create({
  hit: { flex: 1 },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E6E6E1',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  // Dashed and yellow-soft: the one tile that isn't a product
  quick: { borderStyle: 'dashed', borderColor: '#D9B75A', backgroundColor: colors.brandSoft },
  // Capped growth (maxFontSizeMultiplier) so large text can't push the tile past 82px
  emoji: { fontSize: 20, lineHeight: 24 },
  title: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink, paddingRight: 18 },
  subtitle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16, color: colors.muted, ...tabular },
  subtitleQuick: { color: '#8A6A00' },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontFamily: fonts.extrabold, fontSize: 12, lineHeight: 15, color: colors.brand },
})
