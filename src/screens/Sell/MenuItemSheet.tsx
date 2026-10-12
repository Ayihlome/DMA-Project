import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import BottomSheet from '../../components/ui/BottomSheet'
import FilledInput from '../../components/ui/FilledInput'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { stockItems } from '../../data/inventory'
import type { Product, RecipeLine } from '../../data/types'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { menuNames } from './sellModel'

/** What the editor is opened for: a new item in a group, or an existing item. */
export type MenuEdit = { group: string; product?: Product }

type Mode = 'item' | 'pick' | 'new'

/** Kilos and litres are typed in grams and millilitres — nobody weighs 0.03 kg of chips. */
const SMALL: Record<string, { unit: string; factor: number }> = {
  kg: { unit: 'g', factor: 1000 },
  L: { unit: 'ml', factor: 1000 },
}

const NEW_UNITS = ['piece', 'slice', 'kg', 'L'] as const

/** Draft recipe line: qty kept as text while typing ("0." is a valid moment). */
type Line = { productId: string; qty: string }

const parse = (t: string) => {
  const n = Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/**
 * Add or edit a made-to-order item — from the Sell screen, mid-sale. The sale
 * in progress lives apart from the catalogue, so nothing here can disturb it.
 *
 * The ingredients are the point: every sale of the item takes them off stock.
 * Ingredients that aren't in the app yet are created right here, so a shop
 * starting burgers doesn't have to leave the counter to add "burger patty".
 */
export default function MenuItemSheet({
  edit,
  onSaved,
  onClose,
}: {
  edit: MenuEdit | null
  /** Called with the saved item, or null if it was taken off the menu. */
  onSaved: (product: Product | null, group: string) => void
  onClose: () => void
}) {
  return (
    <BottomSheet
      visible={!!edit}
      onClose={onClose}
      handleOnly
      // Title and back arrow are drawn by the form, which knows its mode
    >
      {(finish) => (edit ? <Form edit={edit} onSaved={onSaved} finish={finish} /> : null)}
    </BottomSheet>
  )
}

function Form({
  edit,
  onSaved,
  finish,
}: {
  edit: MenuEdit
  onSaved: (product: Product | null, group: string) => void
  finish: () => void
}) {
  const store = useStore()
  const existing = edit.product

  const [mode, setMode] = useState<Mode>('item')
  const [name, setName] = useState(existing?.name ?? '')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [group, setGroup] = useState(existing?.menu ?? edit.group)
  const [lines, setLines] = useState<Line[]>(() =>
    (existing?.recipe ?? []).map((l) => {
      const p = store.state.products.find((x) => x.id === l.productId)
      const small = p ? SMALL[p.unit] : undefined
      return { productId: l.productId, qty: String(small ? Math.round(l.qty * small.factor) : l.qty) }
    }),
  )
  const [confirmRemove, setConfirmRemove] = useState(false)
  // What was typed into the ingredient search, carried into "New ingredient"
  const [newName, setNewName] = useState('')

  const byId = useMemo(() => new Map(store.state.products.map((p) => [p.id, p])), [store.state.products])
  const groups = useMemo(() => menuNames(store.state.products), [store.state.products])

  const recipe: RecipeLine[] = lines
    .map((l) => {
      const p = byId.get(l.productId)
      const small = p ? SMALL[p.unit] : undefined
      return { productId: l.productId, qty: parse(l.qty) / (small ? small.factor : 1) }
    })
    .filter((l) => l.qty > 0)

  const priceValue = parse(price)
  const canSave = name.trim().length > 0 && priceValue > 0 && group.trim().length > 0

  const save = () => {
    const product = store.saveMenuItem({ name, price: priceValue, menu: group, recipe }, existing?.id)
    onSaved(product, product.menu ?? group)
    finish()
  }

  const remove = () => {
    if (!existing) return
    store.removeMenuItem(existing.id)
    onSaved(null, group)
    finish()
  }

  const addLine = (p: Product) => {
    setLines((ls) => (ls.some((l) => l.productId === p.id) ? ls : [...ls, { productId: p.id, qty: '1' }]))
    setMode('item')
  }

  if (mode === 'pick') {
    return (
      <PickIngredient
        exclude={new Set(lines.map((l) => l.productId))}
        onBack={() => setMode('item')}
        onPick={addLine}
        onNew={(typed) => {
          setNewName(typed)
          setMode('new')
        }}
      />
    )
  }

  if (mode === 'new') {
    return (
      <NewIngredient
        initialName={newName}
        onBack={() => setMode('pick')}
        onCreate={(input) => addLine(store.addIngredient(input))}
      />
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.body}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {existing ? 'Edit item' : `Add to ${group || 'menu'}`}
      </Text>

      <FilledInput label="Name, e.g. Cheese burger" value={name} onChangeText={setName} autoCapitalize="words" />
      <FilledInput label="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shows on Sell under</Text>
        {groups.length ? (
          <View style={styles.chips}>
            {groups.map((g) => (
              <PressableScale
                key={g}
                onPress={() => setGroup(g)}
                accessibilityRole="button"
                accessibilityState={{ selected: g === group.trim() }}
                accessibilityLabel={`Group ${g}`}
                style={[styles.chip, g === group.trim() && styles.chipOn]}
                hitSlop={4}
              >
                <Text style={styles.chipText}>{g}</Text>
              </PressableScale>
            ))}
          </View>
        ) : null}
        <FilledInput
          label="Or type a new group — Burgers, Menu…"
          value={group}
          onChangeText={setGroup}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ingredients</Text>
        <Text style={styles.sectionHint}>
          {lines.length
            ? 'Taken off stock every time this sells. Amounts are for one.'
            : "Add what goes into one. Without ingredients it still sells, but nothing comes off stock."}
        </Text>

        {lines.map((l) => {
          const p = byId.get(l.productId)
          if (!p) return null
          const small = SMALL[p.unit]
          return (
            <View key={l.productId} style={styles.line}>
              <Text style={styles.lineName} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={styles.qtyField}>
                <TextInput
                  value={l.qty}
                  onChangeText={(t) =>
                    setLines((ls) => ls.map((x) => (x.productId === l.productId ? { ...x, qty: t } : x)))
                  }
                  keyboardType="decimal-pad"
                  style={styles.qtyInput}
                  accessibilityLabel={`Amount of ${p.name} in ${small ? small.unit : p.unitPlural}`}
                  selectTextOnFocus
                />
                <Text style={styles.qtyUnit}>{small ? small.unit : parse(l.qty) === 1 ? p.unit : p.unitPlural}</Text>
              </View>
              <PressableScale
                onPress={() => setLines((ls) => ls.filter((x) => x.productId !== l.productId))}
                accessibilityLabel={`Remove ${p.name}`}
                style={styles.lineRemove}
                hitSlop={8}
              >
                <MaterialIcon name="close" size={16} color={colors.muted} />
              </PressableScale>
            </View>
          )
        })}

        <PressableScale onPress={() => setMode('pick')} accessibilityLabel="Add an ingredient" style={styles.addLine}>
          <Text style={styles.addLineText}>+ Add ingredient</Text>
        </PressableScale>
      </View>

      <PrimaryButton label={existing ? 'Save changes' : 'Add to menu'} onPress={save} disabled={!canSave} />

      {existing ? (
        confirmRemove ? (
          <View style={styles.confirm}>
            <Text style={styles.confirmText}>{`Take ${existing.name} off the menu? Past sales keep its name.`}</Text>
            <View style={styles.confirmRow}>
              <PressableScale onPress={() => setConfirmRemove(false)} containerStyle={styles.flex} style={styles.keep}>
                <Text style={styles.keepText}>Keep it</Text>
              </PressableScale>
              <PressableScale onPress={remove} containerStyle={styles.flex} style={styles.removeConfirm}>
                <Text style={styles.removeConfirmText}>Remove</Text>
              </PressableScale>
            </View>
          </View>
        ) : (
          <PressableScale onPress={() => setConfirmRemove(true)} accessibilityLabel="Remove from menu" style={styles.removeLink}>
            <Text style={styles.removeLinkText}>Remove from menu</Text>
          </PressableScale>
        )
      ) : null}
    </ScrollView>
  )
}

function PickIngredient({
  exclude,
  onBack,
  onPick,
  onNew,
}: {
  exclude: Set<string>
  onBack: () => void
  onPick: (p: Product) => void
  onNew: (typed: string) => void
}) {
  const store = useStore()
  const [q, setQ] = useState('')
  // Anything with a shelf count can be cooked with — ingredients and stock alike
  // (a quarter loaf is a quarter of the bread the shop already counts)
  const items = useMemo(
    () =>
      stockItems(store.state)
        .filter((p) => !exclude.has(p.id) && p.name.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => Number(b.category === 'ingredients') - Number(a.category === 'ingredients') || a.name.localeCompare(b.name)),
    [store.state, exclude, q],
  )

  return (
    <View style={styles.body}>
      <ModeHeader title="Add ingredient" onBack={onBack} />
      <FilledInput label="Search stock" value={q} onChangeText={setQ} autoCorrect={false} />
      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {items.map((p) => (
          <PressableScale key={p.id} onPress={() => onPick(p)} accessibilityLabel={`Use ${p.name}`} style={styles.row}>
            <Text style={styles.rowName} numberOfLines={1}>
              {p.name}
            </Text>
            <Text style={styles.rowMeta}>{p.unit}</Text>
          </PressableScale>
        ))}
        {items.length === 0 ? <Text style={styles.sectionHint}>{q.trim() ? `No stock called "${q.trim()}".` : 'No stock items yet.'}</Text> : null}
      </ScrollView>
      <PrimaryButton
        label={q.trim() ? `+ New ingredient "${q.trim()}"` : '+ New ingredient'}
        onPress={() => onNew(q.trim())}
      />
    </View>
  )
}

function NewIngredient({
  initialName,
  onBack,
  onCreate,
}: {
  initialName: string
  onBack: () => void
  onCreate: (input: { name: string; unit: string; packSize: number; cost?: number }) => void
}) {
  const [name, setName] = useState(initialName)
  const [unit, setUnit] = useState<(typeof NEW_UNITS)[number]>('piece')
  const [pack, setPack] = useState('')
  const [packPrice, setPackPrice] = useState('')

  const packSize = Math.max(1, parse(pack) || 1)
  const cost = parse(packPrice) > 0 ? parse(packPrice) / packSize : undefined

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
      <ModeHeader title="New ingredient" onBack={onBack} />
      <FilledInput label="Name, e.g. Burger patty" value={name} onChangeText={setName} autoCapitalize="words" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Counted in</Text>
        <View style={styles.chips}>
          {NEW_UNITS.map((u) => (
            <PressableScale
              key={u}
              onPress={() => setUnit(u)}
              accessibilityRole="button"
              accessibilityState={{ selected: u === unit }}
              style={[styles.chip, u === unit && styles.chipOn]}
              hitSlop={4}
            >
              <Text style={styles.chipText}>{u === 'piece' ? 'pieces' : u === 'slice' ? 'slices' : u}</Text>
            </PressableScale>
          ))}
        </View>
      </View>

      <FilledInput
        label={`How many ${unit === 'kg' || unit === 'L' ? unit : `${unit}s`} in what you buy`}
        value={pack}
        onChangeText={setPack}
        keyboardType="decimal-pad"
      />
      <FilledInput
        label="What you pay for that (optional)"
        value={packPrice}
        onChangeText={setPackPrice}
        keyboardType="decimal-pad"
        hint={cost ? `${money(cost)} per ${unit} — used to show what an item costs to make` : undefined}
      />

      <PrimaryButton
        label="Create and add"
        disabled={!name.trim()}
        onPress={() => onCreate({ name, unit, packSize, cost })}
      />
    </ScrollView>
  )
}

function ModeHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.modeHeader}>
      <PressableScale onPress={onBack} accessibilityLabel="Back" style={styles.back}>
        <MaterialIcon name="chevron_left" size={20} color={colors.ink} />
      </PressableScale>
      <Text style={styles.heading} accessibilityRole="header">
        {title}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 0 },
  body: { gap: space.lg, paddingBottom: space.sm },
  heading: { ...type.titleSm, color: colors.ink, flexShrink: 1 },
  section: { gap: space.sm },
  sectionTitle: { ...type.bodyStrong, color: colors.ink },
  sectionHint: { ...type.caption, color: colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: 38,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: '#E6E6E1',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  lineName: { ...type.bodyStrong, color: colors.ink, flex: 1 },
  qtyField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: space.md,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
  },
  qtyInput: { ...type.bodyStrong, ...tabular, color: colors.ink, minWidth: 40, textAlign: 'right', paddingVertical: 0 },
  qtyUnit: { ...type.caption, color: colors.muted },
  lineRemove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  addLine: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CFCFC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLineText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  confirm: { gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#FDECEA' },
  confirmText: { ...type.caption, color: colors.ink },
  confirmRow: { flexDirection: 'row', gap: space.sm },
  keep: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  removeConfirm: { height: 48, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  removeConfirmText: { fontFamily: fonts.bold, fontSize: 15, color: colors.surface },
  removeLink: { alignSelf: 'center', paddingVertical: space.sm },
  removeLinkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  modeHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  back: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { maxHeight: 300 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEA',
  },
  rowName: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink, flex: 1 },
  rowMeta: { ...type.caption, color: colors.muted },
})
