import React, { useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import PressableScale from '../../components/ui/PressableScale'
import {
  KITCHEN_QUESTIONS,
  POTATO_DEFAULTS,
  defaultKitchen,
  type ChipsAnswer,
  type KitchenAnswers,
} from '../../data/starterPacks'
import { colors, fonts, radius, space, tabular, type } from '../../theme/tokens'

const parse = (t: string) => {
  const n = Number(t.replace(',', '.').trim())
  return t.trim() !== '' && Number.isFinite(n) ? n : NaN
}

/**
 * "How do you make them?": the kitchen questions in the owner's own terms —
 * "One loaf makes about [4] kotas" — for the ingredients in `used` (starter
 * ids). The answers become recipe amounts (see kitchenRecipe in starterPacks).
 */
export default function KitchenQuestions({
  used,
  value,
  onChange,
}: {
  used: Set<string>
  value: Required<KitchenAnswers>
  onChange: (k: Required<KitchenAnswers>) => void
}) {
  return (
    <View style={styles.list}>
      {used.has('fries') ? <ChipsCard value={value.chips} onChange={(chips) => onChange({ ...value, chips })} /> : null}
      {KITCHEN_QUESTIONS.filter((q) => used.has(q.id)).map((q) => (
        <NumberLine
          key={q.id}
          label={q.label}
          after={q.after}
          value={value.answers[q.id]}
          onChange={(n) => onChange({ ...value, answers: { ...value.answers, [q.id]: n } })}
        />
      ))}
    </View>
  )
}

/** "One loaf makes about [4] kotas": a number in a sentence, prefilled. */
function NumberLine({
  label,
  after,
  value,
  onChange,
}: {
  label: string
  after: string
  value: number
  onChange: (n: number) => void
}) {
  const [text, setText] = useState(String(value))
  return (
    <View style={styles.numberLine}>
      <Text style={[styles.numberLabel, styles.flex]}>{label}</Text>
      <TextInput
        value={text}
        onChangeText={(t) => {
          setText(t)
          const n = parse(t)
          if (Number.isFinite(n) && n > 0) onChange(n)
        }}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus
        accessibilityLabel={`${label}, in ${after}`}
        style={styles.numberInput}
      />
      <Text style={styles.numberAfter}>{after}</Text>
    </View>
  )
}

/** Chips: frozen bags, or cut from potatoes. The questions follow the answer. */
function ChipsCard({ value, onChange }: { value: ChipsAnswer; onChange: (c: ChipsAnswer) => void }) {
  const bag = value.mode === 'bag' ? value : defaultKitchen().chips
  const potato = value.mode === 'potato' ? value : { mode: 'potato' as const, ...POTATO_DEFAULTS }
  const choose = (mode: 'bag' | 'potato') => onChange(mode === 'bag' ? bag : potato)

  return (
    <View style={styles.chipsCard}>
      <Text style={styles.rowName}>Chips</Text>
      <View style={styles.choiceRow}>
        {(
          [
            ['bag', 'Frozen bags'],
            ['potato', 'I cut potatoes'],
          ] as const
        ).map(([mode, label]) => {
          const on = value.mode === mode
          return (
            <PressableScale
              key={mode}
              onPress={() => choose(mode)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              containerStyle={styles.flex}
              style={[styles.choice, on && styles.choiceOn]}
            >
              <Text style={styles.choiceText}>{label}</Text>
            </PressableScale>
          )
        })}
      </View>
      {value.mode === 'bag' ? (
        <NumberLine
          key="bag"
          label="A 2 kg bag does about"
          after="kotas"
          value={value.kotasPerBag}
          onChange={(n) => onChange({ mode: 'bag', kotasPerBag: n })}
        />
      ) : (
        <>
          <NumberLine
            key="per-potato"
            label="One potato gives about"
            after="chips"
            value={value.chipsPerPotato}
            onChange={(n) => onChange({ ...value, chipsPerPotato: n })}
          />
          <NumberLine
            key="per-kota"
            label="A kota gets about"
            after="chips"
            value={value.chipsPerKota}
            onChange={(n) => onChange({ ...value, chipsPerKota: n })}
          />
          <NumberLine
            key="per-bag"
            label="A bag you buy has about"
            after="potatoes"
            value={value.potatoesPerBag}
            onChange={(n) => onChange({ ...value, potatoesPerBag: n })}
          />
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: space.md },
  flex: { flex: 1 },
  rowName: { ...type.bodyStrong, color: colors.ink },
  chipsCard: { gap: space.sm, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.brandSoft },
  choiceRow: { flexDirection: 'row', gap: space.sm },
  choice: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.ink },
  choiceText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  numberLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 48 },
  numberLabel: { ...type.caption, color: colors.ink },
  numberInput: {
    ...type.bodyStrong,
    ...tabular,
    color: colors.ink,
    minWidth: 56,
    height: 44,
    paddingHorizontal: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
    textAlign: 'center',
  },
  numberAfter: { ...type.caption, color: colors.muted, minWidth: 56 },
})
