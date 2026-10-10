import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { CATEGORIES, PRODUCTS, type Category, type Product } from './data/salesData'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

export default function SalesScreen() {
  const insets = useSafeAreaInsets()
  const [category, setCategory] = useState<Category>('all')
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [cartOpen, setCartOpen] = useState(false)
  const [lastSale, setLastSale] = useState<number | null>(null)

  const query = search.trim().toLowerCase()
  const shown = PRODUCTS.filter(
    p => (category === 'all' || p.category === category) && (!query || p.name.toLowerCase().includes(query))
  )
  const lines = PRODUCTS.filter(p => cart[p.id])
  const itemCount = lines.reduce((s, p) => s + cart[p.id], 0)
  const total = lines.reduce((s, p) => s + p.price * cart[p.id], 0)

  function add(p: Product) {
    if (p.needsRecipe) return
    setLastSale(null)
    setCart(c => ({ ...c, [p.id]: (c[p.id] ?? 0) + 1 }))
  }

  function changeQty(id: string, delta: number) {
    setCart(c => {
      const qty = (c[id] ?? 0) + delta
      const next = { ...c }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  function recordSale() {
    setLastSale(total)
    setCart({})
    setCartOpen(false)
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Sell" />

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Find an item"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipScroll}
      >
        {CATEGORIES.map(c => {
          const active = category === c.key
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => setCategory(c.key)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 220 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {lastSale !== null && (
          <View style={styles.saved}>
            <MaterialIcons name="check_circle" size={20} color={colors.secondary} />
            <Text style={styles.savedText}>Sale of {rand(lastSale)} recorded. Stock updated.</Text>
          </View>
        )}

        {shown.length === 0 && <Text style={styles.empty}>No items match &ldquo;{search}&rdquo;.</Text>}

        {shown.map(p => {
          const qty = cart[p.id] ?? 0
          const lowStock = p.stock !== null && p.stock < 10
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => add(p)}
              disabled={p.needsRecipe}
              style={[styles.tile, qty > 0 && styles.tileSelected, p.needsRecipe && styles.tileDisabled]}
              activeOpacity={0.7}
              accessibilityLabel={`Add ${p.name}`}
            >
              <View style={styles.tileTop}>
                <View style={styles.tileIcon}>
                  <MaterialIcons name={p.icon} size={22} color={colors.primary} />
                </View>
                {qty > 0 && (
                  <View style={styles.qtyBadge}>
                    <Text style={styles.qtyBadgeText}>{qty}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.tileName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.tileSize} numberOfLines={1}>{p.size}</Text>
              <Text style={styles.tilePrice}>{rand(p.price)}</Text>
              {p.needsRecipe ? (
                <Text style={styles.tileWarn}>Add a recipe to sell this</Text>
              ) : p.stock === null ? (
                <Text style={styles.tileStock}>Made to order</Text>
              ) : (
                <Text style={[styles.tileStock, lowStock && { color: colors.warningDefault }]}>{p.stock} in stock</Text>
              )}
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Cart */}
      <View style={[styles.cart, { paddingBottom: insets.bottom + 72 }]}>
        {itemCount === 0 ? (
          <Text style={styles.cartHint}>Tap an item to add it to the sale.</Text>
        ) : (
          <>
            <TouchableOpacity onPress={() => setCartOpen(o => !o)} style={styles.cartHeader} activeOpacity={0.7}>
              <Text style={styles.cartTitle}>
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </Text>
              <View style={styles.cartToggle}>
                <Text style={styles.cartToggleText}>{cartOpen ? 'Hide' : 'Show'}</Text>
                <MaterialIcons name={cartOpen ? 'expand_more' : 'expand_less'} size={18} color={colors.primary} />
              </View>
            </TouchableOpacity>

            {cartOpen && (
              <ScrollView style={styles.cartList}>
                {lines.map(p => (
                  <View key={p.id} style={styles.cartLine}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cartName}>{p.name}</Text>
                      {p.recipe && <Text style={styles.cartRecipe}>Uses: {p.recipe}</Text>}
                    </View>
                    <View style={styles.stepper}>
                      <TouchableOpacity onPress={() => changeQty(p.id, -1)} style={styles.stepBtn} accessibilityLabel={`Remove one ${p.name}`}>
                        <MaterialIcons name="remove" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                      <Text style={styles.stepQty}>{cart[p.id]}</Text>
                      <TouchableOpacity onPress={() => changeQty(p.id, 1)} style={styles.stepBtn} accessibilityLabel={`Add one ${p.name}`}>
                        <MaterialIcons name="add" size={18} color={colors.textPrimary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.cartLineTotal}>{rand(p.price * cart[p.id])}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity onPress={recordSale} style={styles.recordBtn} activeOpacity={0.85}>
              <Text style={styles.recordText}>Record sale</Text>
              <Text style={styles.recordTotal}>{rand(total)}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}
