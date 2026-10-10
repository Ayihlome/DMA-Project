import React, { useCallback, useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, useWindowDimensions, View } from 'react-native';
import Reanimated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { G, Path } from 'react-native-svg';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../theme/theme';

/**
 * Reanimated, not the classic Animated API. react-native-svg's web build routes
 * setNativeProps through WebShape, which only understands how Reanimated calls
 * it, so animating SVG props with Animated throws on web.
 */
const AnimatedPath = Reanimated.createAnimatedComponent(Path);

// Stroke lengths of each path (in the 1000x1000 design space), used for the "draw-on" effect
const LEN = { hex: 1100, y: 370, v: 184, tape: 140, line: 150 };
const WORD = 'stock evo'.split('');
const EASE = Easing.bezier(0.65, 0, 0.35, 1);

// Letter i fades up over LETTER_MS starting at LETTER_FROM + i * LETTER_STAGGER.
// The name comes in first, so the screen never reads as blank while the mark is
// still being drawn above it.
const LETTER_FROM = 300;
const LETTER_STAGGER = 55;
const LETTER_MS = 560;

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
  background = colors.bgBase,
  ink = colors.primary,
}: Props) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width, height, 600);
  const s = size / 1000;

  const hex = useSharedValue(0);
  const yLine = useSharedValue(0);
  const vLine = useSharedValue(0);
  const tape = useSharedValue(0);
  const line = useSharedValue(0);
  const flap = useSharedValue(0);
  const pop = useSharedValue(1);
  const fade = useSharedValue(1);

  const [introDone, setIntroDone] = useState(false);
  const [started, setStarted] = useState(false);
  // Each letter animates itself off this, so no shared value crosses into Letter
  const [wordMode, setWordMode] = useState<'idle' | 'animate' | 'instant'>('idle');

  const start = useCallback(async () => {
    if (started) return;
    setStarted(true);

    // Hand over from the native (static) splash to this animated one
    await SplashScreen.hideAsync().catch(() => {});

    const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
    if (reduceMotion) {
      // No motion, but still hold the finished logo long enough to register
      for (const v of [hex, yLine, vLine, tape, line, flap]) v.value = 1;
      setWordMode('instant');
      setTimeout(() => setIntroDone(true), 1500);
      return;
    }

    const draw = (v: SharedValue<number>, duration: number, delay: number) => {
      v.value = withDelay(delay, withTiming(1, { duration, easing: EASE }));
    };

    // Total intro ~4.3s: slow enough to read the logo being drawn
    draw(hex, 1800, 200);
    draw(yLine, 1150, 1300);
    draw(vLine, 900, 1950);
    draw(tape, 600, 2700);
    draw(line, 520, 3150);
    draw(flap, 420, 3450);
    setWordMode('animate');

    // The pop finishes last, so it ends the intro
    pop.value = withDelay(
      3800,
      withSequence(
        withTiming(1.045, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 340, easing: Easing.out(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) runOnJS(setIntroDone)(true);
        }),
      ),
    );
  }, [started, hex, yLine, vLine, tape, line, flap, pop]);

  // Fade out only when the intro has played AND the app is ready
  useEffect(() => {
    if (!introDone || !isReady) return;
    // Smooth exit: the logo gently zooms toward you while the splash dissolves into the app
    fade.value = withDelay(
      350,
      withTiming(0, { duration: 800, easing: EASE }, (finished) => {
        'worklet';
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [introDone, isReady, fade, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const zoomStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(fade.value, [0, 1], [1.12, 1]) }],
  }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  // One hook per path: strokeDashoffset walks from the full length down to 0
  const hexProps = useAnimatedProps(() => ({ strokeDashoffset: LEN.hex * (1 - hex.value) }));
  const yProps = useAnimatedProps(() => ({ strokeDashoffset: LEN.y * (1 - yLine.value) }));
  const vProps = useAnimatedProps(() => ({ strokeDashoffset: LEN.v * (1 - vLine.value) }));
  const tapeProps = useAnimatedProps(() => ({ strokeDashoffset: LEN.tape * (1 - tape.value) }));
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: LEN.line * (1 - line.value) }));
  const flapProps = useAnimatedProps(() => ({ opacity: flap.value }));

  return (
    <Reanimated.View
      onLayout={start}
      accessible
      accessibilityLabel="Stock Evo is loading"
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: background }, rootStyle]}
    >
      <Reanimated.View style={[{ width: size, height: size }, zoomStyle]}>
        <Reanimated.View style={[StyleSheet.absoluteFill, popStyle]}>
          <Svg width={size} height={size} viewBox="0 0 1000 1000">
            <G fill="none" stroke={ink} strokeLinejoin="miter" strokeLinecap="butt">
              <AnimatedPath
                strokeWidth={33}
                d="M471 384 L646 449 L646 625 L471 691 L298 625 L298 449 Z"
                strokeDasharray={[LEN.hex, LEN.hex]}
                animatedProps={hexProps}
              />
              <AnimatedPath
                strokeWidth={32}
                d="M298 449 L473 509 L646 449"
                strokeDasharray={[LEN.y, LEN.y]}
                animatedProps={yProps}
              />
              <AnimatedPath
                strokeWidth={32}
                d="M473 509 L473 691"
                strokeDasharray={[LEN.v, LEN.v]}
                animatedProps={vProps}
              />
              <AnimatedPath
                strokeWidth={30}
                d="M440 397 L566 450"
                strokeDasharray={[LEN.tape, LEN.tape]}
                animatedProps={tapeProps}
              />
              <AnimatedPath
                strokeWidth={7}
                stroke={background}
                d="M463 390 L600 442"
                strokeDasharray={[LEN.line, LEN.line]}
                animatedProps={lineProps}
              />
              <AnimatedPath
                fill={ink}
                stroke="none"
                d="M546 452 L576 440 L576 511 L546 525 Z"
                animatedProps={flapProps}
              />
            </G>
          </Svg>
        </Reanimated.View>

        <View style={[styles.word, { top: 718 * s }]}>
          {WORD.map((ch, i) => (
            <Letter key={i} ch={ch} index={i} mode={wordMode} ink={ink} scale={s} />
          ))}
        </View>
      </Reanimated.View>
    </Reanimated.View>
  );
}

/**
 * Its own component so each letter can call hooks; hooks inside the map above
 * would be a loop.
 */
function Letter({
  ch,
  index,
  mode,
  ink,
  scale,
}: {
  ch: string
  index: number
  mode: 'idle' | 'animate' | 'instant'
  ink: string
  scale: number
}) {
  const v = useSharedValue(0);

  useEffect(() => {
    if (mode === 'instant') {
      v.value = 1;
    } else if (mode === 'animate') {
      v.value = withDelay(
        LETTER_FROM + index * LETTER_STAGGER,
        withTiming(1, { duration: LETTER_MS, easing: Easing.out(Easing.cubic) }),
      );
    }
  }, [mode, index, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * 22 * scale }],
  }));

  return (
    <Reanimated.Text
      style={[
        {
          color: ink,
          fontSize: 70 * scale,
          fontWeight: '500',
          letterSpacing: -0.3 * scale,
        },
        style,
      ]}
    >
      {ch}
    </Reanimated.Text>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 999, elevation: 999 },
  word: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
});
