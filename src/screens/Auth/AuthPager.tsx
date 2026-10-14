import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Keyboard, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'
import * as Haptics from 'expo-haptics'
import { AuthPagerContext, type PagerSegment } from './authPagerContext'
import RegisterScreen from './RegisterScreen'
import SignInScreen from './SignInScreen'

/** Left to right, matching the pill: Sign in | Create account. */
const PAGES: PagerSegment[] = ['sign-in', 'register']

/**
 * The tap slide. iOS's sheet curve: a quick start that decelerates into place,
 * which is the shape a flicked page makes as it settles, so a tap and a swipe
 * read as the same motion. 340ms — a full screen-width of travel needs a touch
 * more than the 300ms used for smaller moves.
 */
const SLIDE = {
  duration: 340,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
  reduceMotion: ReduceMotion.System,
}

/**
 * Sign in and Create account side by side in one horizontal pager.
 *
 * Swiping is a native paging ScrollView: it tracks the finger 1:1, shows both
 * pages mid-swipe, carries flick momentum and snaps, on the native side.
 *
 * Tapping the pill does *not* use `scrollTo({ animated: true })`, because that
 * hands the animation to the platform: a fixed curve on iOS, a shorter one on
 * Android, and browser smooth-scroll on web, where scroll-snap can fight it.
 * Instead a shared value runs SLIDE on the UI thread and moves the scroll view
 * frame by frame, so the tap slide is identical everywhere.
 *
 * Both routes (/sign-in and /register) render this, differing only in the page
 * they open on.
 */
export default function AuthPager({ initial }: { initial: PagerSegment }) {
  const { width } = useWindowDimensions()
  const scroller = useAnimatedRef<Animated.ScrollView>()

  // Read once. Feeding a changing value back into contentOffset would make the
  // scroll view jump to it on re-render — that was the tap "pop".
  const [initialIndex] = useState(() => PAGES.indexOf(initial))
  const [page, setPage] = useState(initialIndex)
  const pageRef = useRef(initialIndex)

  /** Where the scroll view is right now, kept in step by the scroll handler. */
  const offset = useSharedValue(initialIndex * width)
  /** Drives the scroll view while a tap slide is running. */
  const slideX = useSharedValue(initialIndex * width)
  const sliding = useSharedValue(false)

  // Each frame of a tap slide, push the animated value into the scroll view.
  // Idle the rest of the time, so it never fights the user's finger.
  useDerivedValue(() => {
    if (sliding.get()) scrollTo(scroller, slideX.get(), 0, false)
  })

  const settle = useCallback((next: number) => {
    if (next === pageRef.current) return
    pageRef.current = next
    setPage(next)
  }, [])

  /**
   * A swipe came to rest. Runs on the JS side, because the page ref isn't
   * visible from the UI thread. Swipes tick when the page lands; taps already
   * ticked on press, and by now have moved the ref, so they don't tick twice.
   */
  const landed = useCallback(
    (next: number) => {
      if (next !== pageRef.current) Haptics.selectionAsync()
      settle(next)
    },
    [settle],
  )

  const goTo = useCallback(
    (segment: PagerSegment) => {
      const next = PAGES.indexOf(segment)
      Keyboard.dismiss()
      // Feedback at the tap, the causal moment — not when the slide lands
      Haptics.selectionAsync()
      // Start from wherever the pages actually are, so tapping mid-swipe
      // carries on from there instead of jumping
      slideX.set(offset.get())
      sliding.set(true)
      slideX.set(
        withTiming(next * width, SLIDE, () => {
          sliding.set(false)
        }),
      )
      settle(next)
    },
    [offset, settle, slideX, sliding, width],
  )

  /**
   * A plain JS function for the worklet below to schedule. Passing
   * `Keyboard.dismiss` itself would make the worklet capture the `Keyboard`
   * object, which can't be copied to the UI thread and crashes on mount.
   */
  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), [])

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      offset.set(e.contentOffset.x)
    },
    onBeginDrag: () => {
      // A finger always wins: grabbing the pages mid-slide stops the tap
      // animation where it is and hands over to the drag
      if (sliding.get()) {
        cancelAnimation(slideX)
        sliding.set(false)
      }
      // A keyboard left up for a field on the other page would cover the form
      // you're swiping to
      scheduleOnRN(dismissKeyboard)
    },
    onMomentumEnd: (e) => {
      scheduleOnRN(landed, Math.round(e.contentOffset.x / width))
    },
  })

  // Stay on the current page when the width changes (rotation, or a browser
  // window being resized)
  useEffect(() => {
    scroller.current?.scrollTo({ x: pageRef.current * width, animated: false })
  }, [scroller, width])

  const context = useMemo(() => ({ goTo }), [goTo])

  return (
    <AuthPagerContext.Provider value={context}>
      <Animated.ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentOffset={{ x: initialIndex * width, y: 0 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.flex}
      >
        {PAGES.map((p, i) => (
          <View
            key={p}
            style={{ width }}
            // The page off to the side is still mounted, so hide it from
            // screen readers or they'd read both forms as one
            accessibilityElementsHidden={i !== page}
            importantForAccessibility={i === page ? 'auto' : 'no-hide-descendants'}
          >
            {p === 'sign-in' ? <SignInScreen /> : <RegisterScreen />}
          </View>
        ))}
      </Animated.ScrollView>
    </AuthPagerContext.Provider>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
})
