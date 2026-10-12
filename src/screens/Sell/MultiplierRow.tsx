import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import PressableScale from '../../components/ui/PressableScale'
import { colors, fonts, radius, space, type } from '../../theme/tokens'

export const MULTIPLIERS = [1, 2, 3, 5, 10] as const

/**
 * "How many?": the next tap adds this many. Drops back to ×1 after one add,
 * so a ×10 left selected can't silently multiply the next customer's bread.
 */
export default function MultiplierRow({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Text style={styles.label}>How many?</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MULTIPLIERS.map((n) => {
            const on = n === value
            return (
              <PressableScale
                key={n}
                onPress={() => {
                  Haptics.selectionAsync()
                  onChange(n)
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Add ${n} at a time`}
                containerStyle={styles.chipHit}
                style={[styles.chip, on && styles.chipOn]}
                hitSlop={4}
              >
                <Text style={styles.chipText}>{`×${n}`}</Text>
              </PressableScale>
            )
          })}
        </View>
      </View>
      <Text style={styles.hint}>Tap to add · hold to keep adding the last one you sold</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  label: { ...type.bodyStrong, color: colors.ink },
  chips: { flex: 1, flexDirection: 'row', gap: 6 },
  chipHit: { flex: 1 },
  chip: {
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#E6E6E1',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontFamily: fonts.extrabold, fontSize: 14, color: colors.ink },
  hint: { ...type.badge, color: colors.muted },
})
