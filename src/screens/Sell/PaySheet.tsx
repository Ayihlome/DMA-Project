import React, { useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  Easing,
  FadeIn,
  LayoutAnimationConfig,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import BottomSheet from '../../components/ui/BottomSheet'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import type { PaymentMethod } from '../../data/types'
import { colors, DURATION, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import Keypad, { pressKey, type Key } from './Keypad'
import { cashOptions } from './sellModel'

const METHODS: PaymentMethod[] = ['Cash', 'Card']
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1)
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1)
/** The "Other" chip: an amount typed on the keypad instead of a single note. */
const OTHER = 'other'
/** Below this the calculator's keys get shorter so the whole sheet fits (iPhone SE is 667). */
const SHORT_SCREEN = 740
/**
 * Swapping between the chips and the calculator. Opacity only, 150ms: it's seen
 * often, so it just stops the sheet from blinking, and a fade is fine under
 * reduced motion too.
 */
const STEP_FADE = FadeIn.duration(150).easing(EASE_OUT).reduceMotion(ReduceMotion.Never)

const round2 = (n: number) => Math.round(n * 100) / 100

type Props = {
  visible: boolean
  total: number
  onDone: (payment: PaymentMethod, cashGiven?: number) => void
  onClose: () => void
}

/**
 * Charge: payment method, and for cash, what the customer gave and the change.
 * "Done · next customer" saves the sale and clears the tab for the next one.
 *
 * Cash is the default and Exact is pre-picked, so the common sale — exact cash —
 * is one tap: Charge, Done. "Other" opens a calculator for anything that isn't
 * a single note, like R30 paid with R72.
 */
export default function PaySheet(props: Props) {
  // Mounted only while open, so every charge starts on Cash, Exact, nothing typed
  if (!props.visible) return null
  return <PayFlow total={props.total} onDone={props.onDone} onClose={props.onClose} />
}

function PayFlow({ total, onDone, onClose }: Omit<Props, 'visible'>) {
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [given, setGiven] = useState<string>('exact')
  const [digits, setDigits] = useState('')
  const [typing, setTyping] = useState(false)
  // Enter on a laptop can fire again while the sheet is leaving: one sale per charge
  const saved = useRef(false)
  const short = useWindowDimensions().height < SHORT_SCREEN

  const typed = Number(digits || '0')
  const options = cashOptions(total)
  const gave = given === OTHER ? typed : (options.find((o) => o.key === given)?.amount ?? total)
  const diff = round2(gave - total)
  const owes = method === 'Cash' && diff < 0

  const openCalculator = () => {
    setGiven(OTHER)
    setTyping(true)
  }
  const back = () => {
    setTyping(false)
    // Nothing typed: fall back to Exact rather than leave R0 picked
    if (!digits) setGiven('exact')
  }

  return (
    <BottomSheet
      visible
      onClose={onClose}
      title={typing ? `Charge · ${money(total)}` : 'Charge'}
      onBack={typing ? back : undefined}
    >
      {(finish) => {
        const done = () => {
          if (owes || saved.current) return
          saved.current = true
          onDone(method, method === 'Cash' ? gave : undefined)
          finish()
        }
        return (
          // Skips the fade on first open: the sheet's own slide covers that
          <LayoutAnimationConfig skipEntering>
            {typing ? (
              <Animated.View key="calculator" entering={STEP_FADE}>
                <CashCalculator
                  total={total}
                  digits={digits}
                  compact={short}
                  onKey={(k) => setDigits((d) => pressKey(d, k))}
                  onDone={done}
                />
              </Animated.View>
            ) : (
              <Animated.View key="chips" entering={STEP_FADE}>
                <PayBody
                  total={total}
                  method={method}
                  onMethod={setMethod}
                  given={given}
                  onGiven={setGiven}
                  typed={digits ? typed : null}
                  onOther={openCalculator}
                  diff={diff}
                  owes={owes}
                  onDone={done}
                />
              </Animated.View>
            )}
          </LayoutAnimationConfig>
        )
      }}
    </BottomSheet>
  )
}

function PayBody({
  total,
  method,
  onMethod,
  given,
  onGiven,
  typed,
  onOther,
  diff,
  owes,
  onDone,
}: {
  total: number
  method: PaymentMethod
  onMethod: (m: PaymentMethod) => void
  given: string
  onGiven: (key: string) => void
  /** The amount on the calculator, or null if nothing has been typed. */
  typed: number | null
  onOther: () => void
  diff: number
  owes: boolean
  onDone: () => void
}) {
  const options = cashOptions(total)
  const otherOn = given === OTHER

  return (
    <View style={styles.body}>
      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>Total</Text>
        <RollingNumber value={money(total)} style={styles.total} />
      </View>

      <Segmented value={method} onChange={onMethod} />

      {method === 'Cash' ? (
        <View style={styles.cash}>
          <Text style={styles.sectionLabel}>Customer gave</Text>
          <View style={styles.chips}>
            {options.map((o) => {
              const on = o.key === given
              return (
                <PressableScale
                  key={o.key}
                  onPress={() => {
                    Haptics.selectionAsync()
                    onGiven(o.key)
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={o.key === 'exact' ? 'Exact amount' : `Gave ${o.label}`}
                  containerStyle={styles.chipHit}
                  style={[styles.chip, on && styles.chipOn]}
                  hitSlop={4}
                >
                  <Text style={styles.chipText}>{o.label}</Text>
                </PressableScale>
              )
            })}
            <PressableScale
              onPress={() => {
                Haptics.selectionAsync()
                onOther()
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: otherOn }}
              accessibilityLabel={
                typed != null ? `Gave ${money(typed, { whole: true })}, tap to change` : 'Type another amount'
              }
              containerStyle={styles.chipHit}
              style={[styles.chip, otherOn && styles.chipOn]}
              hitSlop={4}
            >
              {typed != null ? (
                <Text style={styles.chipText}>{money(typed, { whole: true })}</Text>
              ) : (
                <View style={styles.otherLabel}>
                  <MaterialIcon name="dialpad" size={16} color={colors.ink} />
                  <Text style={styles.chipText}>Other</Text>
                </View>
              )}
            </PressableScale>
          </View>

          <Animated.View style={[styles.change, owes && styles.changeOwes]} accessibilityLiveRegion="polite">
            <Text style={[styles.changeLabel, owes && styles.owesText]}>{owes ? 'Still owes' : 'Change'}</Text>
            <RollingNumber value={money(Math.abs(diff))} style={[styles.changeValue, owes && styles.owesText]} />
          </Animated.View>
        </View>
      ) : null}

      <PrimaryButton
        label={owes ? `Still owes ${money(-diff)}` : 'Done · next customer'}
        disabled={owes}
        onPress={onDone}
      />
    </View>
  )
}

/**
 * The cash calculator: type what the customer handed over, read the change.
 * What they gave sits on top and the change right under it, in the order the
 * owner thinks it: "they gave me 72, so 42 goes back".
 */
function CashCalculator({
  total,
  digits,
  compact,
  onKey,
  onDone,
}: {
  total: number
  digits: string
  compact: boolean
  onKey: (k: Key) => void
  onDone: () => void
}) {
  const typed = Number(digits || '0')
  const empty = digits === ''
  const diff = round2(typed - total)
  const owes = !empty && diff < 0

  return (
    <View style={styles.calc}>
      <View style={styles.readout}>
        <View style={styles.gaveRow}>
          <Text style={styles.readoutLabel}>Customer gave</Text>
          <RollingNumber
            value={money(typed, { whole: true })}
            style={[styles.gaveValue, empty && styles.placeholder]}
            accessibilityLabel={empty ? 'Nothing typed yet' : `Customer gave ${money(typed, { whole: true })}`}
          />
        </View>
        <View style={[styles.changeRow, owes && styles.changeOwes]} accessibilityLiveRegion="polite">
          <Text style={[styles.readoutLabel, owes && styles.owesText]}>{owes ? 'Still owes' : 'Change'}</Text>
          <RollingNumber
            value={money(empty ? 0 : Math.abs(diff))}
            style={[styles.changeValue, empty && styles.placeholder, owes && styles.owesText]}
          />
        </View>
      </View>

      <Keypad onKey={onKey} onEnter={onDone} compact={compact} />

      <PrimaryButton
        label={empty ? 'Type what they gave' : owes ? `Still owes ${money(-diff)}` : 'Done · next customer'}
        disabled={empty || owes}
        onPress={onDone}
      />
    </View>
  )
}

/**
 * Cash / Card. The selected pill slides between segments in 200ms
 * (ease-in-out — it's moving across the screen, not entering it). It's
 * absolutely positioned with no children, so only its transform animates and
 * nothing else re-lays-out. The tick fires on press, not when the pill lands.
 */
function Segmented({ value, onChange }: { value: PaymentMethod; onChange: (m: PaymentMethod) => void }) {
  const [width, setWidth] = useState(0)
  const x = useSharedValue(0)
  const index = METHODS.indexOf(value)
  const seg = width / METHODS.length

  useEffect(() => {
    if (!seg) return
    x.set(withTiming(index * seg, { duration: DURATION.base, easing: EASE_IN_OUT, reduceMotion: ReduceMotion.System }))
  }, [index, seg, x])

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }))
  // The pill's own copy of the labels, shifted back so they line up with the row
  // underneath: the yellow moves with the pill instead of jumping ahead of it
  const counter = useAnimatedStyle(() => ({ transform: [{ translateX: -x.get() }] }))

  return (
    <View
      style={styles.track}
      onLayout={(e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width - TRACK_PAD * 2
        if (w === width) return
        setWidth(w)
        // First measure: put the pill in place without a slide in from zero
        x.set(METHODS.indexOf(value) * (w / METHODS.length))
      }}
      accessibilityRole="radiogroup"
    >
      {METHODS.map((m) => {
        const on = m === value
        return (
          <PressableScale
            key={m}
            onPress={() => {
              if (on) return
              Haptics.selectionAsync()
              onChange(m)
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Pay by ${m}`}
            containerStyle={styles.segHit}
            style={styles.seg}
            hitSlop={0}
          >
            <Text style={styles.segText}>{m}</Text>
          </PressableScale>
        )
      })}
      {seg > 0 ? (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.pill, { width: seg }, pill]}
        >
          <Animated.View style={[styles.pillRow, { width }, counter]}>
            {METHODS.map((m) => (
              <View key={m} style={[styles.seg, { width: seg }]}>
                <Text style={[styles.segText, styles.segTextOn]}>{m}</Text>
              </View>
            ))}
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  )
}

const TRACK_PAD = 4

const styles = StyleSheet.create({
  body: { gap: space.xl },
  totalBlock: { alignItems: 'center', gap: 2 },
  totalLabel: { ...type.caption, color: colors.muted },
  total: { fontFamily: fonts.extrabold, fontSize: 44, lineHeight: 52, letterSpacing: -1, color: colors.ink },

  track: {
    flexDirection: 'row',
    padding: TRACK_PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
  },
  pill: {
    position: 'absolute',
    top: TRACK_PAD,
    bottom: TRACK_PAD,
    left: TRACK_PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    overflow: 'hidden',
  },
  pillRow: { flexDirection: 'row', height: '100%' },
  segHit: { flex: 1 },
  seg: { height: 48, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bold, fontSize: 16, color: colors.muted },
  segTextOn: { color: colors.brand },

  cash: { gap: space.md },
  sectionLabel: { ...type.bodyStrong, color: colors.ink },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chipHit: { flexGrow: 1, flexBasis: '22%' },
  chip: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
    // Includes transform: this style goes into PressableScale, and a
    // transitionProperty here replaces its own — leaving transform out would
    // make the press scale snap instead of animate
    transitionProperty: ['transform', 'backgroundColor', 'borderColor'],
    transitionDuration: [`${DURATION.press}ms`, `${DURATION.base}ms`, `${DURATION.base}ms`],
    transitionTimingFunction: ['ease-out', 'ease', 'ease'],
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  chipText: { fontFamily: fonts.extrabold, fontSize: 16, color: colors.ink },
  otherLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs },

  change: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    transitionProperty: 'backgroundColor',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease',
  },
  changeOwes: { backgroundColor: '#FDECEA' },
  changeLabel: { ...type.titleSm, color: colors.ink },
  changeValue: { fontFamily: fonts.extrabold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6, color: colors.ink },
  owesText: { color: colors.danger },

  calc: { gap: space.lg },
  // One card, two bands: what came in on grey, what goes back on yellow
  readout: { borderRadius: radius.lg, overflow: 'hidden' },
  gaveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    backgroundColor: colors.field,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    backgroundColor: colors.brandSoft,
    transitionProperty: 'backgroundColor',
    transitionDuration: `${DURATION.base}ms`,
    transitionTimingFunction: 'ease',
  },
  // The label gives way on a narrow phone; an amount is never squeezed or cut
  readoutLabel: { ...type.bodyStrong, color: colors.ink, flexShrink: 1 },
  gaveValue: { fontFamily: fonts.extrabold, fontSize: 36, lineHeight: 44, letterSpacing: -0.8, color: colors.ink, ...tabular },
  placeholder: { color: colors.muted },
})
