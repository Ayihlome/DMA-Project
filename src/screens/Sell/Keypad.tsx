import React, { useEffect, useRef } from 'react'
import { Platform, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import { colors, radius, space, type } from '../../theme/tokens'

/** Whole rands only — counter amounts are; it keeps the keypad to one row of digits. */
const MAX_DIGITS = 5
export const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const
export type Key = (typeof KEYS)[number]

/** The digits after a key press: no leading zeros, at most MAX_DIGITS. */
export function pressKey(digits: string, k: Key): string {
  if (k === 'del') return digits.slice(0, -1)
  const next = (digits + k).replace(/^0+/, '')
  return next.length > MAX_DIGITS ? digits : next
}

/**
 * The counter keypad: 1–9, 00, 0, delete. Shared by Quick amount and the
 * cash calculator so both feel like the same tool.
 *
 * A keypad of its own rather than the system keyboard: it can't cover the
 * amount, it can't switch to letters, and it's always the same size.
 *
 * On web the laptop keyboard works too (digits, Backspace, Enter), because
 * that is where a mouse user's hands already are.
 */
export default function Keypad({
  onKey,
  onEnter,
  compact = false,
}: {
  onKey: (k: Key) => void
  /** Enter on a laptop keyboard. */
  onEnter?: () => void
  /** Shorter keys, for sheets that also show a summary on small phones. */
  compact?: boolean
}) {
  useLaptopKeys(onKey, onEnter)

  return (
    <View style={styles.keys}>
      {KEYS.map((k) => (
        <View key={k} style={styles.keyCell}>
          <PressableScale
            onPress={() => {
              Haptics.selectionAsync()
              onKey(k)
            }}
            accessibilityLabel={k === 'del' ? 'Delete' : k}
            style={[styles.key, compact && styles.keyCompact]}
            hitSlop={0}
          >
            {k === 'del' ? (
              <MaterialIcon name="backspace" size={22} color={colors.ink} />
            ) : (
              <Text style={styles.keyText}>{k}</Text>
            )}
          </PressableScale>
        </View>
      ))}
    </View>
  )
}

function useLaptopKeys(onKey: (k: Key) => void, onEnter?: () => void) {
  // The latest handlers, so the listener is added once rather than on every keystroke
  const handlers = useRef({ onKey, onEnter })
  useEffect(() => {
    handlers.current = { onKey, onEnter }
  })

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) handlers.current.onKey(e.key as Key)
      else if (e.key === 'Backspace') handlers.current.onKey('del')
      else if (e.key === 'Enter' && handlers.current.onEnter) handlers.current.onEnter()
      else return
      // Ours alone: the sheet opens with focus on its Close button, which would
      // otherwise take Enter and close the sheet instead of finishing
      e.preventDefault()
      e.stopPropagation()
    }
    // Capture phase, so the keypad hears the key before any focused button does
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [])
}

const styles = StyleSheet.create({
  keys: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  keyCell: { width: '33.333%', padding: space.xs },
  key: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyCompact: { height: 48 },
  keyText: { ...type.titleSm, color: colors.ink },
})
