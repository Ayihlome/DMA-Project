import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { Loading, LoadError, Note } from '../../components/common/ScreenState'
import { colors, radius, spacing, type } from '../../theme/theme'
import { useCases } from '../../backend/useCases/container'
import { useUseCase } from '../../hooks/use-use-case'
import { iconFor, round2 } from '../shared/productPresentation'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

type StockItem = { id: string; name: string; unit: string; category: string | null; pack_size: number; is_composite: number | boolean }
type PriceOption = { supplierID: string; supplierName: string; location: string | null; unitPrice: number; minimumOrder: number | null }

export default function SupplyScreen() {
  const insets = useSafeAreaInsets()
  const products = useUseCase(async () => {
    const all: StockItem[] = await useCases.getSellableProducts({})
    return all.filter(p => !p.is_composite)
  })
  const [productId, setProductId] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [packPrice, setPackPrice] = useState('')
  const [unitsPerPack, setUnitsPerPack] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const list = products.data ?? []
  const product = list.find(p => p.id === productId) ?? list[0]
  const supply = useUseCase<PriceOption[]>(
    () => (product ? useCases.getSupplierPrices({ productID: product.id }) : Promise.resolve([])),
    [product?.id],
  )
  const sorted = supply.data ?? []
  const cheapest = sorted[0]
  const chosen = sorted.find(s => s.supplierID === selected) ?? cheapest
  const unit = product?.unit ?? 'unit'
  const packSize = product?.pack_size ?? 1

  function openForm() {
    setSupplierName('')
    setPackPrice('')
    setUnitsPerPack(String(packSize))
    setFormError(null)
    setModalVisible(true)
  }

  async function submitPrice() {
    if (!product || saving) return
    setSaving(true)
    setFormError(null)
    try {
      const pack = Number(packPrice.replace(',', '.'))
      const units = Number(unitsPerPack.replace(',', '.'))
      if (!(pack >= 0) || !(units > 0)) {
        setFormError('Enter the pack price and how many are in a pack.')
        return
      }
      const result = await useCases.saveSupplierPrice({
        productID: product.id,
        supplierName,
        unitPrice: round2(pack / units),
      })
      if (!result.success) {
        setFormError(result.errors.join(' '))
        return
      }
      setModalVisible(false)
      setSaved(false)
      await supply.reload()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'The price could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  if (!products.data) {
    return (
      <View style={styles.screen}>
        <AppHeader screenLabel="Supplier prices" />
        {products.error ? <LoadError message={products.error} onRetry={products.reload} /> : <Loading />}
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Supplier prices" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 170 }]}
        showsVerticalScrollIndicator={false}
      >
        {list.length === 0 && <Note>No products yet. Add one under Products, then save its supplier prices here.</Note>}

        {list.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs, paddingBottom: spacing.sm }}>
            {list.map(p => {
              const on = p.id === product?.id
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => { setProductId(p.id); setSelected(null); setSaved(false) }}
                  style={{
                    paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: radius.full,
                    borderWidth: 1, borderColor: on ? colors.primary : colors.borderDefault,
                    backgroundColor: on ? colors.accentTint : colors.bgSurface,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[type.label, { color: on ? colors.primary : colors.textPrimary }]}>{p.name}</Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>
        )}

        {product && (
          <View style={styles.itemCard}>
            <View style={styles.itemIcon}>
              <MaterialIcons name={iconFor(product.category)} size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{product.name}</Text>
              <Text style={styles.itemPack}>{packSize > 1 ? `Pack of ${packSize}` : `Sold by the ${unit}`}</Text>
            </View>
          </View>
        )}

        {product && supply.error && !supply.data && <LoadError message={supply.error} onRetry={supply.reload} />}
        {product && !supply.data && !supply.error && <Loading />}
        {product && supply.data && sorted.length === 0 && (
          <Note>No supplier prices saved for {product.name} yet. Tap &quot;Add a new price&quot; to save the first one.</Note>
        )}

        {cheapest && chosen && (
          <>
            <Text style={styles.summary}>
              Cheapest is <Text style={styles.summaryStrong}>{cheapest.supplierName}</Text> at {rand(cheapest.unitPrice)} a {unit}.
            </Text>

            <View style={styles.list}>
              {sorted.map((s, i) => {
                const isSelected = chosen.supplierID === s.supplierID
                const extra = s.unitPrice - cheapest.unitPrice
                const meta = [s.location, s.minimumOrder ? `min ${s.minimumOrder}` : null].filter(Boolean).join(' · ')
                return (
                  <TouchableOpacity
                    key={s.supplierID}
                    onPress={() => { setSelected(s.supplierID); setSaved(false) }}
                    style={[styles.row, i > 0 && styles.rowDivider, isSelected && styles.rowSelected]}
                    activeOpacity={0.7}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={[styles.radio, isSelected && styles.radioOn]}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.supplierName}>{s.supplierName}</Text>
                      {meta !== '' && <Text style={styles.supplierMeta}>{meta}</Text>}
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

            <Text style={styles.listNote}>
              Price per {unit}.{packSize > 1 ? ` A pack of ${packSize} from ${chosen.supplierName} costs ${rand(chosen.unitPrice * packSize)}.` : ''}
            </Text>
          </>
        )}

        {product && (
          <TouchableOpacity onPress={openForm} style={styles.addBtn} activeOpacity={0.7}>
            <MaterialIcons name="add" size={20} color={colors.primary} />
            <Text style={styles.addText}>Add a new price</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {chosen && (
        <View style={[styles.actionBar, { paddingBottom: insets.bottom + 72 }]}>
          <TouchableOpacity
            onPress={() => setSaved(true)}
            style={[styles.actionBtn, saved && styles.actionBtnDone]}
            activeOpacity={0.85}
          >
            {saved && <MaterialIcons name="check" size={20} color={colors.onPrimary} />}
            <Text style={styles.actionText} numberOfLines={1}>
              {saved ? `Buying from ${chosen.supplierName}` : `Buy from ${chosen.supplierName}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
              value={supplierName}
              onChangeText={setSupplierName}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pack price (R)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="135.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textSecondary}
                  value={packPrice}
                  onChangeText={setPackPrice}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Units per pack</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholderTextColor={colors.textSecondary}
                  value={unitsPerPack}
                  onChangeText={setUnitsPerPack}
                />
              </View>
            </View>
            {formError && <Text style={[type.caption, { color: colors.errorDefault, marginBottom: spacing.xs }]}>{formError}</Text>}
            <TouchableOpacity onPress={submitPrice} disabled={saving} style={[styles.actionBtn, saving && { opacity: 0.6 }]}>
              <Text style={styles.actionText}>{saving ? 'Saving...' : 'Save price'}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
