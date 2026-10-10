import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
  Modal,
  Animated,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

import { CATEGORIES, type Category, type Product } from './data/salesData'
import { styles } from './styles'
import { useSalesData } from './useSalesData'
import { useStore } from '../../store'
import { deductionsFor } from '../../data/inventory'
import { track } from '../../lib/telemetry'

interface CartItem {
  id: string
  name: string
  unit: number
  qty: number
  hasRecipe?: boolean
}

export default function SalesScreen() {
  const insets = useSafeAreaInsets()
  const store = useStore()
  const { PRODUCTS } = useSalesData()
  const [category, setCategory] = useState<Category>('all')
  const [cart, setCart] = useState<CartItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(true)
  const [ingredientsOpen, setIngredientsOpen] = useState(true)
  const [toastVisible, setToastVisible] = useState(false)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const saleStartedAt = useRef<number | null>(null)
  const pendingCheck = useRef<{ saleId: string; expected: [string, number][]; before: Record<string, number> } | null>(null)

  const total = cart.reduce((s, i) => s + i.unit * i.qty, 0)

  // BR1 check: compare the stock change that actually committed against what the
  // recipe predicted, once the store has applied it.
  useEffect(() => {
    const check = pendingCheck.current
    if (!check) return
    pendingCheck.current = null
    for (const [productId, expected] of check.expected) {
      const after = store.state.products.find((p) => p.id === productId)?.stock ?? 0
      const actual = Math.round((check.before[productId] - after) * 1000) / 1000
      track('deduction_check', {
        saleId: check.saleId,
        productId,
        expected,
        actual,
        match: Math.abs(actual - expected) < 1e-6,
      })
    }
  }, [store.state])

  function addToCart(p: Product) {
    if (p.disabled) return
    if (cart.length === 0) {
      saleStartedAt.current = Date.now()
      track('sale_started')
    }
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id)
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { id: p.id, name: p.name, unit: p.price, qty: 1, hasRecipe: p.hasRecipe }]
    })
    setDrawerOpen(true)
  }

  function changeQty(id: string, delta: number) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0))
  }

  function confirmSale() {
    const saleTotal = total
    const lines = cart.map((i) => ({ productId: i.id, qty: i.qty }))
    if (!lines.length) return

    const expected = [...deductionsFor(store.state, lines)]
    const before: Record<string, number> = {}
    for (const [productId] of expected) {
      before[productId] = store.state.products.find((p) => p.id === productId)?.stock ?? 0
    }
    const startedAt = saleStartedAt.current

    const result = store.recordSale(lines)
    if (!result.ok) return

    const saleId = `sale-${Date.now()}`
    pendingCheck.current = { saleId, expected, before }
    track('sale_confirmed', {
      saleId,
      duration_ms: startedAt === null ? null : Date.now() - startedAt,
      itemCount: lines.length,
      total: saleTotal,
    })
    saleStartedAt.current = null

    setCart([])
    setConfirmedTotal(saleTotal)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 2800)
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Sales" />

      {/* Toast */}
      {toastVisible && (
        <View style={[styles.toast, { top: 72 + insets.top }]}>
          <MaterialIcons name="check_circle" size={20} color="#83d8a6" />
          <Text style={styles.toastText}>Sale of R{confirmedTotal.toFixed(2)} recorded & stock deducted!</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + drawerOpenHeight(drawerOpen, cart) }]} showsVerticalScrollIndicator={false}>
        {/* Search */}
        <View style={styles.searchBar}>
          <View style={styles.searchInput}>
            <MaterialIcons name="search" size={22} color={colors.textSecondary} />
            <TextInput
              style={styles.searchText}
              placeholder="Search item or scan barcode..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>
          <TouchableOpacity style={styles.scanBtn} activeOpacity={0.8}>
            <MaterialIcons name="qr_code_scanner" size={24} color={colors.onPrimaryContainer} />
          </TouchableOpacity>
        </View>

        {/* Category pills */}
        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={c => c.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              onPress={() => setCategory(c.key)}
              style={[styles.categoryPill, category === c.key && styles.categoryPillActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryText, category === c.key && styles.categoryTextActive]}>{c.label}</Text>
              {category === c.key && <View style={styles.categoryDot} />}
            </TouchableOpacity>
          )}
        />

        {/* Grid header */}
        <View style={styles.gridHeader}>
          <Text style={styles.gridTitle}>Quick Tap Catalog</Text>
          <Text style={styles.gridHint}>Tap card to add +1</Text>
        </View>

        {/* Product grid */}
        <View style={styles.grid}>
          {PRODUCTS.map(p => (
            <TouchableOpacity
              key={p.id}
              onPress={() => addToCart(p)}
              disabled={p.disabled}
              style={[styles.productCard, p.disabled && styles.productCardDisabled]}
              activeOpacity={0.8}
            >
              <View style={styles.productImageWrap}>
                <Image source={{ uri: p.uri }} style={[styles.productImage, p.disabled && { opacity: 0.4 }]} />
                {p.disabled && (
                  <View style={styles.lockedOverlay}>
                    <MaterialIcons name="lock" size={28} color={colors.error} />
                  </View>
                )}
                {p.badge && !p.disabled && (
                  <View style={[styles.productBadge, { backgroundColor: p.badgeBg }]}>
                    <Text style={[styles.productBadgeText, { color: p.badgeText }]}>{p.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.productCategory} numberOfLines={1}>{p.category}</Text>
              {p.disabled && p.disabledReason ? (
                <View style={styles.disabledWarning}>
                  <MaterialIcons name="warning" size={12} color={colors.errorDefault} />
                  <Text style={styles.disabledWarningText}>{p.disabledReason}</Text>
                </View>
              ) : (
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>R{p.price.toFixed(2)}</Text>
                  <View style={styles.addBtn}>
                    <Text style={styles.addBtnText}>+</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Cart Drawer */}
      <View style={[styles.drawer, { bottom: insets.bottom + 64 }]}>
        {/* Handle */}
        <TouchableOpacity onPress={() => setDrawerOpen(o => !o)} style={styles.drawerHandle} activeOpacity={0.9}>
          <View style={styles.drawerPill} />
          <View style={styles.drawerHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text style={styles.drawerTitle}>Current Cart</Text>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length} items</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={styles.drawerToggleText}>{drawerOpen ? 'Hide details' : 'Show items'}</Text>
              <MaterialIcons name={drawerOpen ? 'keyboard_arrow_down' : 'keyboard_arrow_up'} size={20} color={colors.textSecondary} />
            </View>
          </View>
        </TouchableOpacity>

        {drawerOpen && (
          <ScrollView style={styles.drawerBody} showsVerticalScrollIndicator={false}>
            {cart.map(item => (
              <View key={item.id} style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.name}</Text>
                  <Text style={styles.cartItemUnit}>Unit: R{item.unit.toFixed(2)}</Text>
                </View>
                <View style={styles.stepper}>
                  <TouchableOpacity onPress={() => changeQty(item.id, -1)} style={styles.stepperBtn}>
                    <MaterialIcons name="remove" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.stepperQty}>{item.qty}</Text>
                  <TouchableOpacity onPress={() => changeQty(item.id, 1)} style={styles.stepperBtn}>
                    <MaterialIcons name="add" size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>R{(item.unit * item.qty).toFixed(2)}</Text>
              </View>
            ))}
            {cart.find(i => i.id === 'kota') && (
              <TouchableOpacity onPress={() => setIngredientsOpen(o => !o)} style={styles.recipeRow} activeOpacity={0.8}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialIcons name="inventory" size={16} color={colors.primary} />
                  <Text style={styles.recipeLabel}>Ingredient deductions</Text>
                </View>
                <MaterialIcons name={ingredientsOpen ? 'expand_less' : 'expand_more'} size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
            {ingredientsOpen && cart.find(i => i.id === 'kota') && (
              <Text style={styles.recipeText}>Quarter loaf, 50g polony, 1 slice cheese, 100g slap chips will be deducted.</Text>
            )}
          </ScrollView>
        )}

        {/* Sale Total */}
        <View style={styles.saleTotal}>
          <View style={styles.saleSummaryRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.saleSummaryLabel}>Summary ({cart.length} items)</Text>
              <View style={styles.cashPill}>
                <Text style={styles.cashPillText}>Cash Sale</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
              <Text style={styles.saleSummaryLabel}>Total:</Text>
              <Text style={styles.saleTotal2}>R{total.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={confirmSale} style={styles.confirmBtn} activeOpacity={0.85}>
            <MaterialIcons name="payments" size={20} color={colors.onPrimary} />
            <Text style={styles.confirmBtnText}>Confirm Sale (R{total.toFixed(2)})</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}

function drawerOpenHeight(open: boolean, cart: CartItem[]) {
  if (!open) return 160
  return Math.min(400, 160 + cart.length * 80)
}

