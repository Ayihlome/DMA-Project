import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ActionToast, { type Toast } from '../../components/ui/ActionToast'
import ListRow from '../../components/ui/ListRow'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import type { Product } from '../../data/types'
import { colors, fonts, money, space, type } from '../../theme/tokens'
import MenuItemSheet, { type MenuEdit } from './MenuItemSheet'

const SIDE = 28
/** Made-to-order items saved before groups existed, or without one. */
const NO_GROUP = 'No group yet'

/** "R35,00 · 3 ingredients" — and says so plainly when there are none. */
function detailFor(p: Product) {
  const n = p.recipe?.length ?? 0
  return `${money(p.price)} · ${n === 0 ? 'no ingredients yet — nothing comes off stock' : `${n} ingredient${n === 1 ? '' : 's'}`}`
}

/**
 * The menu's one home: every made-to-order item, grouped the way it appears on
 * Sell. Tap one to change its price, group or ingredients; the button adds a
 * new one. Sell keeps its own shortcut (the pencil in a food picker) for quick
 * changes mid-sale — both open the same editor.
 */
export default function MenuScreen() {
  const insets = useSafeAreaInsets()
  const { state } = useStore()
  const [edit, setEdit] = useState<MenuEdit | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const clearToast = useCallback(() => setToast(null), [])

  const groups = useMemo(() => {
    const food = state.products.filter((p) => p.sellable && p.composite)
    const map = new Map<string, Product[]>()
    for (const p of food) {
      const g = p.menu ?? NO_GROUP
      map.set(g, [...(map.get(g) ?? []), p])
    }
    return [...map.entries()]
      .map(([name, items]) => ({ name, items: items.sort((a, b) => a.name.localeCompare(b.name)) }))
      .sort((a, b) => Number(a.name === NO_GROUP) - Number(b.name === NO_GROUP) || a.name.localeCompare(b.name))
  }, [state.products])

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.lead}>Food you make. Every sale takes its ingredients off stock.</Text>

        {groups.length === 0 ? (
          <Text style={styles.empty}>No food yet. Add the first thing you make — a kota, a burger, a plate.</Text>
        ) : null}

        {groups.map((g) => (
          <View key={g.name} style={styles.group}>
            <Text style={styles.groupTitle} accessibilityRole="header">
              {g.name}
            </Text>
            {g.items.map((p, i) => (
              <ListRow
                key={p.id}
                title={p.name}
                detail={detailFor(p)}
                onPress={() => setEdit({ group: p.menu ?? '', product: p })}
                last={i === g.items.length - 1}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton label="Add food you make" onPress={() => setEdit({ group: '' })} />
      </View>

      <ActionToast toast={toast} bottom={insets.bottom + 100} onDone={clearToast} />

      <MenuItemSheet
        edit={edit}
        onSaved={(product, group) =>
          setToast({ message: product ? `${product.name} saved to ${group}` : `Removed from ${group}` })
        }
        onClose={() => setEdit(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.lg },
  lead: { ...type.body, color: colors.quiet },
  empty: { ...type.body, color: colors.quiet, paddingTop: space.xl },
  group: { marginTop: space.xl },
  groupTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet, marginBottom: 2 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SIDE,
    paddingTop: space.md,
    backgroundColor: colors.surface,
  },
})
