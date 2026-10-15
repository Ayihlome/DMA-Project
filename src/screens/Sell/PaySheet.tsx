import React, { useEffect, useState } from 'react'
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import BottomSheet from '../../components/ui/BottomSheet'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import type { PaymentMethod } from '../../data/types'
import { colors, DURATION, fonts, money, radius, space, type } from '../../theme/tokens'
import { cashOptions } from './sellModel'

const METHODS: PaymentMethod[] = ['Cash', 'Card']
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1)


/**
 * Charge: payment method, and for cash, what the customer gave and the change.
 * "Done · next customer" saves the sale and clears the tab for the next one.
 *
 * Cash is the default and Exact is pre-picked, so the common sale — exact cash —
 * is one tap: Charge, Done.
 */
export default function PaySheet({
  visible,
  total,
  onDone,
  onClose,
}: {
  visible: boolean
  total: number
  onDone: (payment: PaymentMethod, cashGiven?: number) => void
  onClose: () => void
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Charge">
      {(finish) => (
        <PayBody
          total={total}
          onDone={(payment, cash) => {
            onDone(payment, cash)
            finish()
          }}
        />
      )}
    </BottomSheet>
  )
}

function PayBody({ total, onDone }: { total: number; onDone: (payment: PaymentMethod, cashGiven?: number) => void }) {
  const [method, setMethod] = useState<PaymentMethod>('Cash')
  const [given, setGiven] = useState<string>('exact')

  const options = cashOptions(total)
  const gave = options.find((o) => o.key === given)?.amount ?? total
  const diff = Math.round((gave - total) * 100) / 100
  const owes = method === 'Cash' && diff < 0

  return (
    <View style={styles.body}>
      <View style={styles.totalBlock}>
        <Text style={styles.totalLabel}>Total</Text>
        <RollingNumber value={money(total)} style={styles.total} />
      </View>

      <Segmented value={method} onChange={setMethod} />

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
                    setGiven(o.key)
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
        onPress={() => onDone(method, method === 'Cash' ? gave : undefined)}
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
})
