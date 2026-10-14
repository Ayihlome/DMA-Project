import React, { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { colors, DURATION, fonts } from '../../theme/tokens'

/** The spec's divider colour — a step lighter than `line`, for plain lists. */
export const DIVIDER = '#EEEEEA'
/** How far the press highlight reaches past the text on each side. */
const BLEED = 12

/**
 * A plain list row, per the spec: title 17/700, an optional muted line 14/500,
 * a › chevron, a 1px divider. No cards, no borders around the list.
 *
 * Press feedback is a soft background tint that bleeds a little past the text,
 * not a scale: rows are tapped all day, and a full-width row shrinking reads
 * as the screen wobbling. Tint on press-in, 120ms, so it answers the finger
 * before the navigation does.
 */
export default function ListRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  last = false,
  accessibilityLabel,
}: {
  title: string
  detail?: string
  /** Left of the title — a status dot, an icon. */
  leading?: ReactNode
  /** Right of the text, before the chevron — a price, a pill. */
  trailing?: ReactNode
  onPress?: () => void
  /** No divider under the final row. */
  last?: boolean
  accessibilityLabel?: string
}) {
  const [down, setDown] = useState(false)

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      disabled={!onPress}
      pressRetentionOffset={16}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? (detail ? `${title}. ${detail}` : title)}
    >
      <Animated.View style={[styles.row, down && styles.rowDown]}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.text}>
          <Text style={styles.title} numberOfLines={2}>
            {title}
          </Text>
          {detail ? (
            <Text style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {trailing}
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </Animated.View>
      {last ? null : <View style={styles.divider} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 17,
    marginHorizontal: -BLEED,
    paddingHorizontal: BLEED,
    borderRadius: 14,
    backgroundColor: 'rgba(17,17,17,0)',
    transitionProperty: 'backgroundColor',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: 'ease',
  },
  rowDown: { backgroundColor: 'rgba(17,17,17,0.05)' },
  leading: { justifyContent: 'center' },
  text: { flex: 1, gap: 3 },
  title: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.ink },
  detail: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 19, color: colors.quiet },
  chevron: { fontFamily: fonts.medium, fontSize: 24, lineHeight: 26, color: colors.quiet, marginTop: -2 },
  divider: { height: 1, backgroundColor: DIVIDER },
})
