import React, { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Extrapolation,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import { scheduleOnRN } from 'react-native-worklets'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcon from '../common/MaterialIcon'
import PressableScale from './PressableScale'
import { project, rubberband } from '../../lib/gestures'
import { colors, radius, space, type } from '../../theme/tokens'

/** Every settle uses the same spring, so all sheets feel like one object. */
const SETTLE = { duration: 300, dampingRatio: 0.8, reduceMotion: ReduceMotion.System } as const
/** Far enough down to be clear of any phone before the sheet is measured. */
const OFFSCREEN = 1200

/** The snap-home tick, as a plain JS function for the gesture worklet to schedule. */
function snapHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

/**
 * The app's one bottom sheet: slides up, drag it down or tap the backdrop to
 * dismiss, and it leaves the way it came in.
 *
 * Rendered in a Modal so it covers the floating tab bar — a sheet drawn inside
 * the screen would sit underneath it. Modal content lives outside the app's
 * GestureHandlerRootView, hence the second root here.
 *
 * `children` can be a function receiving `close`, so content can finish the
 * sheet after a choice (pick a brand → add it → close) with the same exit
 * animation as a dismiss.
 */
export default function BottomSheet({
  visible,
  onClose,
  title,
  onBack,
  handleOnly = false,
  children,
}: {
  visible: boolean
  /** Called once the exit animation has finished. Unmount or hide the sheet here. */
  onClose: () => void
  title?: string
  /** Shows a back arrow, for multi-step pickers. */
  onBack?: () => void
  /**
   * Drag only by the grabber and title row. For sheets whose content scrolls —
   * otherwise scrolling the content would drag the whole sheet down instead.
   */
  handleOnly?: boolean
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onClose}
    >
      {/* Modal unmounts its content when hidden, so every open starts fresh */}
      {visible ? (
        <Sheet onClose={onClose} title={title} onBack={onBack} handleOnly={handleOnly}>
          {children}
        </Sheet>
      ) : null}
    </Modal>
  )
}

function Sheet({
  onClose,
  title,
  onBack,
  handleOnly,
  children,
}: {
  onClose: () => void
  title?: string
  onBack?: () => void
  handleOnly: boolean
  children: ReactNode | ((close: () => void) => ReactNode)
}) {
  const insets = useSafeAreaInsets()
  // Parked below the fold until measured, so it never flashes at full size
  const translateY = useSharedValue(OFFSCREEN)
  const start = useSharedValue(0)
  const [height, setHeight] = useState(OFFSCREEN)
  const entered = useRef(false)
  // A shared value rather than a ref: `close` is handed to children during
  // render, and the compiler rightly won't let a render-time function read a ref
  const closing = useSharedValue(false)

  const onLayout = useCallback(
    (h: number) => {
      setHeight(h)
      if (entered.current || h <= 0) return
      entered.current = true
      translateY.set(h)
      translateY.set(withSpring(0, SETTLE))
    },
    [translateY],
  )

  /** Leaves the way it arrived, then reports closed. */
  const close = useCallback(() => {
    if (closing.get()) return
    closing.set(true)
    translateY.set(
      withSpring(height, { ...SETTLE, dampingRatio: 1, overshootClamping: true }, (finished) => {
        if (finished) scheduleOnRN(onClose)
      }),
    )
  }, [closing, height, onClose, translateY])

  const pan = useMemo(
    () =>
      Gesture.Pan()
        // A little intent first, so taps on the options inside aren't drags
        .activeOffsetY([-10, 10])
        .onStart(() => {
          // From where the sheet actually is: grabbing it mid-animation can't teleport it
          start.set(translateY.get())
        })
        .onUpdate((e) => {
          const next = start.get() + e.translationY
          translateY.set(next >= 0 ? next : rubberband(next, height))
        })
        .onEnd((e) => {
          // Velocity decides, not distance: a quick flick is enough
          if (translateY.get() + project(e.velocityY) > height * 0.4) {
            translateY.set(
              withSpring(
                height,
                { ...SETTLE, dampingRatio: 1, velocity: e.velocityY, overshootClamping: true },
                (finished) => {
                  if (finished) scheduleOnRN(onClose)
                },
              ),
            )
          } else {
            translateY.set(withSpring(0, { ...SETTLE, velocity: e.velocityY }))
            scheduleOnRN(snapHaptic)
          }
        }),
    [height, onClose, start, translateY],
  )

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }))
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, height], [1, 0], Extrapolation.CLAMP),
  }))

  const handle = (
    <View style={styles.handle}>
      <View style={styles.grabber} />
      {title || onBack ? (
        <View style={styles.head}>
          {onBack ? (
            <PressableScale onPress={onBack} accessibilityLabel="Back" style={styles.round}>
              <MaterialIcon name="chevron_left" size={20} color={colors.ink} />
            </PressableScale>
          ) : null}
          <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
            {title}
          </Text>
          <PressableScale onPress={close} accessibilityLabel="Close" style={styles.round}>
            <MaterialIcon name="close" size={18} color={colors.ink} />
          </PressableScale>
        </View>
      ) : null}
    </View>
  )
  const body = typeof children === 'function' ? children(close) : children

  const sheet = (
    <Animated.View
      style={[styles.sheet, sheetStyle, { paddingBottom: insets.bottom + space.lg }]}
      onLayout={(e) => onLayout(e.nativeEvent.layout.height)}
      accessibilityViewIsModal
    >
      {handleOnly ? <GestureDetector gesture={pan}>{handle}</GestureDetector> : handle}
      {body}
    </Animated.View>
  )

  return (
    <GestureHandlerRootView style={styles.root}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={styles.fill} onPress={close} accessibilityLabel="Close" accessibilityRole="button" />
      </Animated.View>

      {/* Keeps fields above the keyboard; the sheet's own height shrinks to fit */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard} pointerEvents="box-none">
        {handleOnly ? sheet : <GestureDetector gesture={pan}>{sheet}</GestureDetector>}
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  keyboard: { flex: 1, justifyContent: 'flex-end' },
  handle: { gap: space.lg },
  fill: { flex: 1 },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(17,17,17,0.45)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space.xl,
    paddingTop: space.md,
    gap: space.lg,
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.line,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.titleSm, color: colors.ink, flex: 1 },
  round: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
