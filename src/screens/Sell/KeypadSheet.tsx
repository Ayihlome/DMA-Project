import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import BottomSheet from '../../components/ui/BottomSheet'
import PrimaryButton from '../../components/ui/PrimaryButton'
import RollingNumber from '../../components/ui/RollingNumber'
import { colors, money, space, type } from '../../theme/tokens'
import Keypad, { pressKey } from './Keypad'

/**
 * Quick amount: ring up something that isn't in the catalogue by typing its
 * price. Adds a line called "Other" — no product, no stock.
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

  const close = () => {
    setDigits('')
    onClose()
  }

  return (
    <BottomSheet visible={visible} onClose={close} title={`Quick amount${multiplier > 1 ? `  ×${multiplier}` : ''}`}>
      {(finish) => {
        const add = () => {
          if (amount <= 0) return
          onAdd(amount)
          finish()
        }
        return (
          <View style={styles.body}>
            <View style={styles.display} accessibilityLabel={`Amount ${money(amount, { whole: true })}`}>
              <RollingNumber value={money(amount, { whole: true })} style={styles.amount} />
            </View>

            <Keypad onKey={(k) => setDigits((d) => pressKey(d, k))} onEnter={add} />

            <PrimaryButton
              label={amount > 0 ? `Add ${multiplier > 1 ? `${multiplier} × ` : ''}${money(amount, { whole: true })}` : 'Type an amount'}
              disabled={amount <= 0}
              onPress={add}
            />
          </View>
        )
      }}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.lg },
  display: { alignItems: 'center', paddingVertical: space.sm },
  amount: { ...type.money, fontSize: 40, lineHeight: 48, color: colors.ink },
})
