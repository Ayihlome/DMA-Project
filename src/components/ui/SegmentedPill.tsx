import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, space, type } from '../../theme/tokens'
import PressableScale from './PressableScale'

export type Segment = { key: string; label: string }

/**
 * "Sign in | Create account" — active segment is black with white text.
 *
 * Deliberately not animated. Each segment navigates to its own route, so the
 * screen unmounts on press and a sliding indicator would be cut off halfway;
 * the screen transition is the motion here. Press feedback is enough.
 */
export default function SegmentedPill({
  segments,
  active,
  onSelect,
}: {
  segments: Segment[]
  active: string
  onSelect: (key: string) => void
}) {
  return (
    <View style={styles.track} accessibilityRole="tablist">
      {segments.map((s) => {
        const on = s.key === active
        return (
          <PressableScale
            key={s.key}
            onPress={() => onSelect(s.key)}
            accessibilityRole="tab"
            accessibilityLabel={s.label}
            accessibilityState={{ selected: on }}
            containerStyle={styles.segmentHit}
            style={[styles.segment, on && styles.segmentOn]}
            hitSlop={0}
          >
            <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1}>
              {s.label}
            </Text>
          </PressableScale>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    padding: space.xs,
    gap: space.xs,
  },
  segmentHit: { flex: 1 },
  segment: {
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  segmentOn: { backgroundColor: colors.ink },
  label: { ...type.bodyStrong, color: colors.muted },
  labelOn: { color: colors.surface },
})
