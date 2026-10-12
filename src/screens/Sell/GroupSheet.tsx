import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import BottomSheet from '../../components/ui/BottomSheet'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import type { Product, SellGridSettings } from '../../data/types'
import { lastFirst, type AddItem, type GroupTile } from './sellModel'

type Option = {
  key: string
  label: string
  detail?: string
  last: boolean
  pick: () => void
  /** Menu items only: the product behind the option, for its pencil. */
  edit?: Product
}

/**
 * The picker behind a group tile.
 *
 * Built-in families: Bread → brand. Cold drink → brand → size. Airtime →
 * network → amount. Owner-named menu groups (Kota, Burgers, Menu): one level,
 * the items in it — plus "+ Add to Burgers" and a pencil on each item, so the
 * menu can be changed right here mid-sale.
 *
 * At every level the option used last time comes first and is highlighted
 * (yellow-soft with a black border): most customers ask for what the last one
 * did, so the common case is one tap from opening.
 */
export default function GroupSheet({
  tile,
  grid,
  multiplier,
  onPick,
  onEditMenu,
  onClose,
}: {
  tile: GroupTile | null
  grid: SellGridSettings
  /** Shown in the title, so it's clear "×3" applies to what's picked here. */
  multiplier: number
  onPick: (item: AddItem, product: Product) => void
  /** Menu groups: open the editor for an item, or for a new one (`null`). The sheet closes first. */
  onEditMenu: (product: Product | null) => void
  onClose: () => void
}) {
  const [variant, setVariant] = useState<string | null>(null)

  const close = () => {
    setVariant(null)
    onClose()
  }

  const lastProduct = tile ? tile.members.find((m) => m.id === grid.lastUsed[tile.id]) : undefined
  const twoLevel = tile?.family === 'colddrink' || tile?.family === 'airtime'

  const title = tile
    ? `${variant ? `${tile.label} · ${variant}` : tile.label}${multiplier > 1 ? `  ×${multiplier}` : ''}`
    : ''

  return (
    <BottomSheet visible={!!tile} onClose={close} title={title} onBack={variant ? () => setVariant(null) : undefined}>
      {(finish) =>
        tile ? (
          <>
            <Options
              tile={tile}
              variant={variant}
              twoLevel={twoLevel}
              lastProduct={lastProduct}
              lastAmount={lastProduct ? grid.lastAmount?.[lastProduct.id] : undefined}
              onVariant={(v) => {
                Haptics.selectionAsync()
                setVariant(v)
              }}
              onPick={(item, product) => {
                onPick(item, product)
                finish()
              }}
              onEdit={(p) => {
                // Hand over first, then leave: the editor opens once this has gone
                onEditMenu(p)
                finish()
              }}
            />
            {tile.menu ? (
              <PressableScale
                onPress={() => {
                  onEditMenu(null)
                  finish()
                }}
                accessibilityLabel={`Add an item to ${tile.label}`}
                style={styles.add}
              >
                <Text style={styles.addText}>{`+ Add to ${tile.label}`}</Text>
              </PressableScale>
            ) : null}
          </>
        ) : null
      }
    </BottomSheet>
  )
}

function Options({
  tile,
  variant,
  twoLevel,
  lastProduct,
  lastAmount,
  onVariant,
  onPick,
  onEdit,
}: {
  tile: GroupTile
  variant: string | null
  twoLevel: boolean
  lastProduct: Product | undefined
  lastAmount: number | undefined
  onVariant: (v: string) => void
  onPick: (item: AddItem, product: Product) => void
  onEdit: (p: Product) => void
}) {
  const options = useMemo<Option[]>(() => {
    if (!twoLevel) {
      // One level: bread brands, or the items in a menu group
      return lastFirst(
        tile.members.map((p) => ({
          key: p.id,
          label: tile.menu ? p.name : (p.variant ?? p.name),
          detail: money(p.price),
          last: p.id === lastProduct?.id,
          pick: () => onPick({ productId: p.id, price: p.price }, p),
          edit: tile.menu ? p : undefined,
        })),
        (o) => o.last,
      )
    }

    if (!variant) {
      const variants = [...new Set(tile.members.map((p) => p.variant ?? p.name))]
      return lastFirst(
        variants.map((v) => ({
          key: v,
          label: v,
          detail: tile.family === 'airtime' ? 'Airtime' : sizesLabel(tile.members, v),
          last: v === lastProduct?.variant,
          pick: () => onVariant(v),
        })),
        (o) => o.last,
      )
    }

    if (tile.family === 'airtime') {
      const p = tile.members.find((m) => m.variant === variant)
      if (!p) return []
      const amounts = p.priceOptions?.length ? p.priceOptions : [p.price]
      const sameNetwork = lastProduct?.id === p.id
      return lastFirst(
        amounts.map((a) => ({
          key: String(a),
          label: money(a, { whole: true }),
          last: sameNetwork && a === lastAmount,
          pick: () => onPick({ productId: p.id, price: a, counterPriced: true }, p),
        })),
        (o) => o.last,
      )
    }

    return lastFirst(
      tile.members
        .filter((m) => m.variant === variant)
        .map((p) => ({
          key: p.id,
          label: p.size === 'can' ? 'Can' : (p.size ?? p.name),
          detail: money(p.price),
          last: p.id === lastProduct?.id,
          pick: () => onPick({ productId: p.id, price: p.price }, p),
        })),
      (o) => o.last,
    )
  }, [tile, variant, twoLevel, lastProduct, lastAmount, onVariant, onPick])

  return (
    <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
      {options.map((o) => (
        <View key={o.key} style={styles.cell}>
          <PressableScale
            onPress={o.pick}
            accessibilityLabel={`${o.label}${o.detail ? `, ${o.detail}` : ''}${o.last ? ', used last time' : ''}`}
            style={[styles.option, o.last && styles.optionLast]}
          >
            <Text style={[styles.label, o.edit && styles.labelWithEdit]} numberOfLines={2}>
              {o.label}
            </Text>
            {o.detail ? (
              <Text style={styles.detail} numberOfLines={1}>
                {o.detail}
              </Text>
            ) : null}
            {o.edit ? <Recipe product={o.edit} /> : null}
          </PressableScale>
          {o.edit ? (
            <PressableScale
              onPress={() => onEdit(o.edit!)}
              accessibilityLabel={`Edit ${o.label}`}
              containerStyle={styles.pencilHit}
              style={styles.pencil}
              hitSlop={8}
            >
              <MaterialIcon name="edit" size={15} color={colors.ink} />
            </PressableScale>
          ) : null}
        </View>
      ))}
    </ScrollView>
  )
}

/** One muted line saying whether the item deducts anything — the thing an owner most needs to know. */
function Recipe({ product }: { product: Product }) {
  const n = product.recipe?.length ?? 0
  return (
    <Text style={[styles.recipe, n === 0 && styles.recipeMissing]} numberOfLines={1}>
      {n === 0 ? 'No ingredients yet' : `${n} ingredient${n === 1 ? '' : 's'}`}
    </Text>
  )
}

/** "can · 500ml · 2L" under a cold-drink brand. */
function sizesLabel(members: Product[], variant: string) {
  return members
    .filter((m) => m.variant === variant)
    .map((m) => m.size)
    .filter(Boolean)
    .join(' · ')
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs, paddingBottom: space.xs },
  // Two per row; the gutter comes from cell padding so 50% always fits
  cell: { width: '50%', padding: space.xs },
  option: {
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.field,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    justifyContent: 'center',
    gap: 2,
  },
  optionLast: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  label: { ...type.bodyStrong, fontSize: 16, color: colors.ink },
  labelWithEdit: { paddingRight: 28 },
  detail: { ...type.caption, ...tabular, color: colors.muted },
  recipe: { ...type.badge, color: colors.muted },
  recipeMissing: { color: colors.danger },
  pencilHit: { position: 'absolute', top: space.xs + 6, right: space.xs + 6 },
  pencil: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  add: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#CFCFC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
})
