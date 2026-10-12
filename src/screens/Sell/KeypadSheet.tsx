import React, { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import BottomSheet from '../../components/ui/BottomSheet'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import { colors, money, radius, space, type } from '../../theme/tokens'

/** Whole rands only — counter amounts are; it keeps the keypad to one row of digits. */
const MAX_DIGITS = 5
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'] as const

/**
 * Quick amount: ring up something that isn't in the catalogue by typing its
 * price. Adds a line called "Other" — no product, no stock.
 *
 * A keypad of its own rather than the system keyboard: it can't cover the
 * amount, it can't switch to letters, and it's always the same size.
 */
export default function KeypadSheet({
  visible,
  multiplier,
  onAdd,
  onClose,
}: {
  visible: boolean
  multiplier: number
  onAdd: (amount: number) => void
  onClose: () => void
}) {
  const [digits, setDigits] = useState('')
  const amount = Number(digits || '0')

  const press = (k: (typeof KEYS)[number]) => {
    Haptics.selectionAsync()
    setDigits((d) => {
      if (k === 'del') return d.slice(0, -1)
      const next = (d + k).replace(/^0+/, '')
      return next.length > MAX_DIGITS ? d : next
    })
  }

  const close = () => {
    setDigits('')
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={close} title={`Quick amount${multiplier > 1 ? `  ×${multiplier}` : ''}`}>
      {(finish) => (
        <View style={styles.body}>
          <View style={styles.display} accessibilityLabel={`Amount ${money(amount, { whole: true })}`}>
            <RollingNumber value={money(amount, { whole: true })} style={styles.amount} />
          </View>

          <View style={styles.keys}>
            {KEYS.map((k) => (
              <View key={k} style={styles.keyCell}>
                <PressableScale
                  onPress={() => press(k)}
                  accessibilityLabel={k === 'del' ? 'Delete' : k}
                  style={styles.key}
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

          <PrimaryButton
            label={amount > 0 ? `Add ${multiplier > 1 ? `${multiplier} × ` : ''}${money(amount, { whole: true })}` : 'Type an amount'}
            disabled={amount <= 0}
            onPress={() => {
              onAdd(amount)
              finish()
            }}
          />
        </View>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  display: { alignItems: 'center', paddingVertical: space.sm },
  amount: { ...type.money, fontSize: 40, lineHeight: 48, color: colors.ink },
  keys: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  keyCell: { width: '33.333%', padding: space.xs },
  key: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: { ...type.titleSm, color: colors.ink },
})
