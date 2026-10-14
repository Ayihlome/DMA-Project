import React, { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'
import { colors, fonts, radius, space } from '../../theme/tokens'

// Module scope: layout-animation builders shouldn't be rebuilt every render.
// Enters and leaves from the bottom; leaving is quicker than arriving.
const ENTER = FadeInDown.duration(200)
const EXIT = FadeOutDown.duration(160)

/** Long enough to read the message and reach the button — not so long it's in the way. */
const PLAIN_MS = 2600
const ACTION_MS = 6000

export type Toast = {
  message: string
  /** "Undo", "Share" — a single action, never two. */
  action?: { label: string; onPress: () => void }
}

/**
 * The black toast, optionally with one action. Only the button takes touches;
 * the rest lets taps through to the screen, so a toast never blocks the next
 * sale. Stays up longer when there's something to tap.
 *
 * The owner keeps `toast` in state and clears it in `onDone`. A new toast
 * replaces the current one (keyed by message), restarting the timer.
 */
export default function ActionToast({
  toast,
  bottom,
  onDone,
}: {
  toast: Toast | null
  bottom: number
  onDone: () => void
}) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, toast.action ? ACTION_MS : PLAIN_MS)
    return () => clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null

  return (
    <Animated.View
      key={toast.message}
      entering={ENTER}
      exiting={EXIT}
      style={[styles.toast, { bottom }]}
      pointerEvents="box-none"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text} numberOfLines={2} pointerEvents="none">
        {toast.message}
      </Text>
      {toast.action ? (
        <Pressable
          onPress={() => {
            toast.action!.onPress()
            onDone()
          }}
          accessibilityRole="button"
          accessibilityLabel={toast.action.label}
          hitSlop={10}
          style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
        >
          <Text style={styles.actionText}>{toast.action.label}</Text>
        </Pressable>
      ) : (
        <View />
      )}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingLeft: space.lg,
    paddingRight: space.md,
  },
  text: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.surface, flex: 1 },
  action: { paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.sm },
  actionPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  actionText: { fontFamily: fonts.bold, fontSize: 15, color: colors.brand },
})
