import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, FlatList } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { styles } from './styles'
import { useStore } from '../../store'
import { pricesFor, supplierName, recommendations } from '../../data/inventory'

const rand = (n: number) => `R${n.toFixed(2)}`

function relativeDate(ts: number, now: number) {
  const days = Math.round((now - ts) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days} days ago`
}

export default function SupplyScreen() {
  const insets = useSafeAreaInsets()
  const store = useStore()
  const { state } = store
  // Stable per mount so "updated N days ago" does not shift on re-render
  const [now] = useState(() => Date.now())

  const sellableProducts = state.products.filter((p) => p.sellable && !p.composite)
  const [selectedProductId, setSelectedProductId] = useState(sellableProducts[0]?.id ?? '')
  const product = sellableProducts.find((p) => p.id === selectedProductId) ?? sellableProducts[0]

  const rawPrices = product ? pricesFor(state, product.id) : []
  const sorted = rawPrices.map((sp) => ({
    id: sp.supplierId,
    name: supplierName(state, sp.supplierId),
    unitPrice: sp.unitPrice,
    updated: relativeDate(sp.updatedAt, now),
    distance: '',
    minOrder: sp.minOrder ? `${sp.minOrder} ${product?.unitPlural ?? 'units'}` : '1 unit',
  }))

  const cheapest = sorted[0]
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const chosen = sorted.find((s) => s.id === selected) ?? cheapest

  const [saved, setSaved] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  // Modal form state
  const [modalSupplier, setModalSupplier] = useState('')
  const [modalPackPrice, setModalPackPrice] = useState('')
  const [modalUnitsPerPack, setModalUnitsPerPack] = useState(String(product?.packSize ?? 1))

  const recs = product ? recommendations(state).find((r) => r.product.id === product.id) : undefined
  const priceMonthAgo = rawPrices[0]?.history?.find((h) => {
    const age = (now - h.at) / 86_400_000
    return age >= 25 && age <= 35
  })?.price ?? (cheapest ? cheapest.unitPrice : 0)
  const priceChange = cheapest ? cheapest.unitPrice - priceMonthAgo : 0

  function handleSavePrice() {
    if (!product || !modalSupplier.trim() || !modalPackPrice) return
    const packPrice = parseFloat(modalPackPrice)
    const unitsPerPack = parseInt(modalUnitsPerPack) || product.packSize || 1
    if (isNaN(packPrice) || packPrice <= 0) return
    store.upsertSupplierPrice({
      productId: product.id,
      supplierName: modalSupplier.trim(),
      unitPrice: Math.round((packPrice / unitsPerPack) * 100) / 100,
    })
    setModalSupplier('')
    setModalPackPrice('')
    setModalUnitsPerPack(String(product.packSize ?? 1))
    setModalVisible(false)
  }

  function handleBuyFrom() {
    if (!product || !chosen) return
    store.setPreferredSupplier(product.id, chosen.id)
    const qty = recs?.qty ?? product.packSize
    store.createOrderList([{ productId: product.id, qty, unitPrice: chosen.unitPrice, supplierId: chosen.id }])
    setSaved(true)
  }

  if (!product) {
    return (
      <View style={styles.screen}>
        <AppHeader screenLabel="Supplier prices" />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Add products first to track supplier prices.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Supplier prices" />

      {/* Product picker */}
      <FlatList
        horizontal
        data={sellableProducts}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
        renderItem={({ item: p }) => (
          <TouchableOpacity
            onPress={() => { setSelectedProductId(p.id); setSelected(undefined); setSaved(false) }}
            style={[{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: p.id === selectedProductId ? colors.primary : colors.borderDefault, backgroundColor: p.id === selectedProductId ? colors.accentTint : colors.bgSurface }]}
            activeOpacity={0.8}
          >
            <Text style={{ color: p.id === selectedProductId ? colors.primary : colors.textPrimary, fontSize: 13, fontWeight: p.id === selectedProductId ? '700' : '400' }}>{p.name}</Text>
          </TouchableOpacity>
        )}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 170 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemCard}>
          <View style={styles.itemIcon}>
            <MaterialIcons name={product.icon} size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{product.name}</Text>
            <Text style={styles.itemPack}>{product.packLabel} · {product.detail}</Text>
          </View>
        </View>

        {sorted.length === 0 ? (
          <Text style={styles.summary}>No supplier prices saved yet. Tap "Add a new price" below to get started.</Text>
        ) : (
          <>
            <Text style={styles.summary}>
              Cheapest is <Text style={styles.summaryStrong}>{cheapest.name}</Text> at {rand(cheapest.unitPrice)} per {product.unit}.
              {' '}
              {priceChange < 0
                ? `That's ${rand(Math.abs(priceChange))} less than a month ago.`
                : priceChange > 0
                  ? `That's ${rand(priceChange)} more than a month ago.`
                  : 'Price unchanged from a month ago.'}
            </Text>

            <View style={styles.list}>
              {sorted.map((s, i) => {
                const isSelected = (chosen?.id === s.id)
                const extra = s.unitPrice - cheapest.unitPrice
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={() => { setSelected(s.id); setSaved(false) }}
                    style={[styles.row, i > 0 && styles.rowDivider, isSelected && styles.rowSelected]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.radio, isSelected && styles.radioOn]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supplierName}>{s.name}</Text>
                      <Text style={styles.supplierMeta}>
                        min {s.minOrder} · updated {s.updated}
                      </Text>
                    </View>
                    <View style={styles.priceCol}>
                      <Text style={styles.price}>{rand(s.unitPrice)}</Text>
                      <Text style={[styles.priceDiff, i === 0 && { color: colors.secondary }]}>
                        {i === 0 ? 'Cheapest' : `+${rand(extra)}`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )
              })}
            </View>

            {chosen && (
              <Text style={styles.listNote}>
                Price per {product.unit}. A {product.packLabel} from {chosen.name} costs {rand(chosen.unitPrice * product.packSize)}.
              </Text>
            )}
          </>
        )}

        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn} activeOpacity={0.7}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Add a new price</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 72 }]}>
        <TouchableOpacity
          onPress={handleBuyFrom}
          disabled={!chosen}
          style={[styles.actionBtn, saved && styles.actionBtnDone]}
          activeOpacity={0.85}
        >
          {saved && <MaterialIcons name="check" size={20} color={colors.onPrimary} />}
          <Text style={styles.actionText} numberOfLines={1}>
            {saved ? `Buying from ${chosen?.name}` : chosen ? `Buy from ${chosen.name}` : 'Add a price first'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={[styles.modalSheet, { paddingBottom: insets.bottom + 16 }]} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add a price</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose} accessibilityLabel="Close">
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Supplier</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cambridge Food"
              placeholderTextColor={colors.textSecondary}
              value={modalSupplier}
              onChangeText={setModalSupplier}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pack price (R)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="135.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                  value={modalPackPrice}
                  onChangeText={setModalPackPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>{product.unitPlural} per pack</Text>
                <TextInput
                  style={styles.input}
                  defaultValue={String(product.packSize ?? 1)}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                  value={modalUnitsPerPack}
                  onChangeText={setModalUnitsPerPack}
                />
              </View>
            </View>
            <TouchableOpacity onPress={handleSavePrice} style={styles.actionBtn}>
              <Text style={styles.actionText}>Save price</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
