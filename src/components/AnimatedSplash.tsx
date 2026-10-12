import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Path } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { LOGO_PATHS, LOGO_STROKE_WIDTH, LOGO_VIEWBOX } from './brand/logoPaths';
import { colors, fonts } from '../theme/tokens';

/**
 * Reanimated, not the classic Animated API. react-native-svg's web build routes
 * setNativeProps through WebShape, which only understands how Reanimated calls
 * it, so animating SVG props with Animated throws on web.
 */
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

const WORD = 'stock evo'.split('');
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Intro timing, ~2.2s end to end.
 *
 * Deliberately slower than the 300ms this app uses everywhere else. That rule
 * is about motion the user sits through repeatedly; this is the brand moment,
 * it plays once per launch, and the whole point is watching the box get drawn.
 * Owner's call, and the right one — but it is the one place in the app allowed
 * to take its time, so don't copy these numbers anywhere else.
 *
 * The strokes overlap rather than queueing strictly, which keeps it feeling
 * drawn rather than spelled out one segment at a time.
 */
const DRAW_MS = 520;
const DRAW_STAGGER = 260;
/** Total travel of the shared draw value. */
const DRAW_TOTAL = DRAW_MS + (LOGO_PATHS.length - 1) * DRAW_STAGGER;
// The name starts arriving while the tape is still being drawn, so the screen
// never reads as finished-then-waiting.
const LETTER_FROM = 1100;
const LETTER_STAGGER = 45;
const LETTER_MS = 300;
/** When the last stroke and the last letter have both landed. */
const INTRO_MS = Math.max(DRAW_TOTAL, LETTER_FROM + WORD.length * LETTER_STAGGER + LETTER_MS);
/** The handover into the sign-in screen. */
const EXIT_MS = 420;

type Props = {
  /** Set to true once your app has finished loading (DB, session, fonts…) */
  isReady: boolean;
  /** Called after the splash has faded out — unmount it here */
  onFinish: () => void;
  background?: string;
  ink?: string;
};

export default function AnimatedSplash({
  isReady,
  onFinish,
  // Defaults match the native splash in app.json so the handover does not flash
  background = colors.brand,
  ink = colors.ink,
}: Props) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height, 320) * 0.46;

  // One value drives every stroke; each path offsets itself off it, so there
  // are no per-path hooks to keep in sync.
  const draw = useSharedValue(0);
  const fade = useSharedValue(1);
  const exit = useSharedValue(0);

  const [introDone, setIntroDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [wordMode, setWordMode] = useState<'idle' | 'animate'>('idle');
  // Reduced motion softens this screen; it no longer skips it. See below.
  const [gentle, setGentle] = useState(false);

  const start = useCallback(async () => {
    if (started) return;
    setStarted(true);

    // Hand over from the native (static) splash to this animated one
    await SplashScreen.hideAsync().catch(() => {});

    /**
     * The draw plays whatever the system Reduce Motion setting says — it is
     * the one animation in the app that does.
     *
     * The usual reading of reduced motion is "fewer and gentler, not zero",
     * and a stroke drawing itself in place is the gentle kind: no travel
     * across the screen, no parallax, no scale, nothing that moves the eye.
     * What reduced motion does suppress here is the letters sliding up and
     * the zoom on exit, which are real movement.
     */
    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    setGentle(reduceMotion);

    setWordMode('animate');
    draw.set(withTiming(1, { duration: DRAW_TOTAL, easing: EASE_OUT }));
    setTimeout(() => setIntroDone(true), INTRO_MS);
  }, [started, draw]);

  /**
   * Leave once the intro has played AND the app is ready — whichever is later,
   * so a fast boot never cuts the draw short.
   *
   * The mark drifts gently toward the viewer as the yellow dissolves, which
   * hands over to the sign-in screen's yellow header rather than cutting to
   * it. Held back under reduced motion, where the scale is the part that
   * actually moves.
   */
  useEffect(() => {
    if (!introDone || !isReady) return;
    exit.set(withTiming(1, { duration: EXIT_MS, easing: EASE_OUT }));
    fade.set(
      withTiming(0, { duration: EXIT_MS, easing: EASE_OUT }, (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onFinish);
      }),
    );
  }, [introDone, isReady, fade, exit, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: gentle ? 1 : 1 + exit.get() * 0.08 }],
  }));

  return (
    <Reanimated.View
      onLayout={start}
      accessible
      accessibilityLabel="Stock Evo is loading"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: background }, rootStyle]}
    >
      <Reanimated.View style={[styles.stack, zoomStyle]}>
        <Svg width={size} height={size} viewBox={LOGO_VIEWBOX} fill="none">
          {LOGO_PATHS.map((p, i) => (
            <Stroke key={p.label} path={p} index={i} draw={draw} ink={ink} />
          ))}
        </Svg>

        <View style={styles.word}>
          {WORD.map((ch, i) => (
            <Letter key={i} ch={ch} index={i} mode={wordMode} ink={ink} gentle={gentle} />
          ))}
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
}

/**
 * One stroke of the mark. Its own component so each can hold a hook — hooks
 * inside the map above would be a loop.
 */
function Stroke({
  path,
  index,
  draw,
  ink,
}: {
  path: (typeof LOGO_PATHS)[number];
  index: number;
  draw: SharedValue<number>;
  ink: string;
}) {
  // Each path consumes its own slice of the shared 0->1 progress, so they
  // overlap instead of queueing.
  const from = (index * DRAW_STAGGER) / DRAW_TOTAL;
  const span = DRAW_MS / DRAW_TOTAL;

  const animatedProps = useAnimatedProps(() => {
    const local = Math.min(1, Math.max(0, (draw.get() - from) / span));
    return { strokeDashoffset: path.length * (1 - local) };
  });

  return (
    <AnimatedPath
      d={path.d}
      stroke={ink}
      strokeWidth={LOGO_STROKE_WIDTH}
      strokeLinejoin="round"
      strokeLinecap="round"
      strokeDasharray={[path.length, path.length]}
      animatedProps={animatedProps}
    />
  );
}

function Letter({
  ch,
  index,
  mode,
  ink,
  gentle,
}: {
  ch: string;
  index: number;
  mode: 'idle' | 'animate';
  ink: string;
  /** Reduced motion: fade the letter up in place, don't slide it. */
  gentle: boolean;
}) {
  const v = useSharedValue(0);

  useEffect(() => {
    if (mode !== 'animate') return;
    v.set(
      withDelay(
        LETTER_FROM + index * LETTER_STAGGER,
        withTiming(1, { duration: LETTER_MS, easing: EASE_OUT }),
      ),
    );
  }, [mode, index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.get(),
    transform: [{ translateY: gentle ? 0 : (1 - v.get()) * 10 }],
  }));

  return <Reanimated.Text style={[styles.letter, { color: ink }, style]}>{ch}</Reanimated.Text>;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 999, elevation: 999 },
  stack: { alignItems: 'center', gap: 20 },
  word: { flexDirection: 'row' },
  letter: {
    // The real brand face, not the system fallback the old splash used. The
    // root layout holds this screen up until the fonts have loaded, so it is
    // always available by the time anything renders here.
    fontFamily: fonts.extrabold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
  },
});
