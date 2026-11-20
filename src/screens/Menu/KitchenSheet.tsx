import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text } from 'react-native'
import BottomSheet from '../../components/ui/BottomSheet'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { isStandardKota, kitchenFrom, KOTA_BUILDS } from '../../data/starterPacks'
import { useStore } from '../../store'
import { colors, space, type } from '../../theme/tokens'
import KitchenQuestions from './KitchenQuestions'

/**
 * "How do you make them?", from Menu: the kitchen questions setup no longer
 * asks. The answers resize every kota still on the standard recipe; one the
 * owner saved themselves is left as it is.
 */
export default function KitchenSheet({ visible, onClose, onSaved }: { visible: boolean; onClose: () => void; onSaved: () => void }) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title="How do you make them?" handleOnly>
      {(finish) => (visible ? <Body finish={finish} onSaved={onSaved} /> : null)}
    </BottomSheet>
  )
}

function Body({ finish, onSaved }: { finish: () => void; onSaved: () => void }) {
  const store = useStore()
  // Only the questions about what the standard kotas use
  const used = useMemo(
    () =>
      new Set(
        store.state.products
          .filter(isStandardKota)
          .flatMap((k) => KOTA_BUILDS.find((b) => b.id === k.template)?.recipe.map((l) => l.productId) ?? []),
      ),
    [store.state.products],
  )
  // What the recipes say now, so a second visit shows the owner's own answers
  const [kitchen, setKitchen] = useState(() => kitchenFrom(store.state.products))

  return (
    <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <Text style={styles.hint}>
        So the app takes the right amount off your stock. Rough numbers are fine. This changes the kotas still on the
        standard recipe; ones you saved yourself stay as they are.
      </Text>
      <KitchenQuestions used={used} value={kitchen} onChange={setKitchen} />
      <PrimaryButton
        label="Save"
        onPress={() => {
          store.applyKitchen(kitchen)
          onSaved()
          finish()
        }}
      />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  body: { gap: space.lg, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  hint: { ...type.caption, color: colors.muted },
})
