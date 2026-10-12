import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import ListRow from '../../components/ui/ListRow'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { useStore } from '../../store'
import { unitQty } from '../../data/inventory'
import type { Product } from '../../data/types'
import { colors, fonts, money, space, type } from '../../theme/tokens'
import MenuItemSheet, { type MenuEdit } from '../Menu/MenuItemSheet'

const SIDE = 28

/** The one muted line under a product: what it sells for and how many are left. */
function detailFor(p: Product) {
  if (p.composite) {
    // A made-to-order item with no ingredients sells but deducts nothing — say so
    return p.recipe?.length ? `${money(p.price)} · made to order` : `${money(p.price)} · no ingredients yet`
  }
  // An ingredient has no selling price, so R0,00 would be a lie; its cost is what matters
  if (!p.sellable) return `Costs ${money(p.cost)} per ${p.unit}${p.untracked ? '' : ` · ${unitQty(p, p.stock)} left`}`
  if (p.untracked) return `${money(p.price)} · not counted`
  return `${money(p.price)} · ${p.stock < 0 ? `sold ${unitQty(p, -p.stock)} past zero` : `${unitQty(p, p.stock)} left`}`
}

/**
 * Every product the shop has, as plain rows: what you sell first, then the
 * ingredients that go into made-to-order food. Ingredients are listed because
 * their cost is what a kota's margin is worked out from — hidden, they'd be
 * numbers nothing could edit.
 */
export default function ProductsScreen() {
  const insets = useSafeAreaInsets()
  const { state } = useStore()

  const { sold, ingredients } = useMemo(() => {
    const byName = (a: Product, b: Product) => a.name.localeCompare(b.name)
    return {
      sold: state.products.filter((p) => p.sellable).sort(byName),
      ingredients: state.products.filter((p) => !p.sellable).sort(byName),
    }
  }, [state.products])

  const [menuEdit, setMenuEdit] = useState<MenuEdit | null>(null)

  const open = (id: string) => router.push({ pathname: '/products/[id]', params: { id } })
  /** Food opens its ingredients editor here, instead of sending the owner off to Sell. */
  const openRow = (p: Product) => (p.composite ? setMenuEdit({ group: p.menu ?? '', product: p }) : open(p.id))

  const section = (title: string, list: Product[]) =>
    list.length ? (
      <View style={styles.section}>
        <Text style={styles.sectionTitle} accessibilityRole="header">
          {title}
        </Text>
        {list.map((p, i) => (
          <ListRow key={p.id} title={p.name} detail={detailFor(p)} onPress={() => openRow(p)} last={i === list.length - 1} />
        ))}
      </View>
    ) : null

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]} showsVerticalScrollIndicator={false}>
        {sold.length + ingredients.length === 0 ? (
          <Text style={styles.empty}>No products yet. Add the first thing you sell.</Text>
        ) : null}
        {section('What you sell', sold)}
        {section('Ingredients', ingredients)}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + space.lg }]}>
        <PrimaryButton label="Add a product" onPress={() => open('new')} />
      </View>

      <MenuItemSheet edit={menuEdit} onSaved={() => {}} onClose={() => setMenuEdit(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.sm },
  section: { marginTop: space.lg },
  sectionTitle: { fontFamily: fonts.bold, fontSize: 14, color: colors.quiet, marginBottom: 2 },
  empty: { ...type.body, color: colors.quiet, paddingTop: space.xl },
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
