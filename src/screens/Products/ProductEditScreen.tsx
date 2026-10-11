import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, Switch, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/theme'
import { useStore } from '../../store'
import { CATEGORIES } from '../../data/types'
import type { CategoryKey } from '../../data/types'
import { Field } from '../Auth/AuthForm'
import { styles } from './styles'

// '' stays NaN instead of becoming 0; decimal comma accepted
const parseNumber = (s: string) => (s.trim() === '' ? NaN : Number(s.trim().replace(',', '.')))

export default function ProductEditScreen() {
  const { id = 'new' } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const { state, addProduct, updateProduct } = useStore()

  const existing = id !== 'new' ? state.products.find(p => p.id === id) : undefined

  const [name, setName] = useState(existing?.name ?? '')
  const [detail, setDetail] = useState(existing?.detail ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [category, setCategory] = useState<CategoryKey>(existing?.category ?? 'pantry')
  const [price, setPrice] = useState(existing ? String(existing.price) : '')
  const [stock, setStock] = useState(existing ? String(existing.stock) : '0')
  const [isComposite, setIsComposite] = useState(existing?.composite ?? false)
  const [packSize, setPackSize] = useState(existing ? String(existing.packSize) : '1')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = !existing

  async function save() {
    const priceVal = parseNumber(price)
    const stockVal = parseNumber(stock)
    const packVal = parseNumber(packSize)

    if (!name.trim()) { setError('Give the product a name.'); return }
    if (!unit.trim()) { setError('Add a unit (e.g. 1L, 6 pack).'); return }
    if (isNaN(priceVal) || priceVal < 0) { setError('Enter a valid selling price.'); return }
    if (isNaN(stockVal) || stockVal < 0) { setError('Enter a valid stock amount.'); return }

    setSaving(true)
    setError(null)

    try {
      const input = {
        name: name.trim(),
        detail: detail.trim() || unit.trim(),
        category,
        price: priceVal,
        stock: isComposite ? 0 : stockVal,
        unit: unit.trim(),
        unitPlural: unit.trim(),
        packSize: isNaN(packVal) || packVal <= 0 ? 1 : packVal,
      }
      if (isNew) addProduct(input)
      else updateProduct(existing.id, input)
      router.back()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bgBase }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Field label="Product name" value={name} onChangeText={setName} placeholder="e.g. White bread" autoCapitalize="words" />
          <Field label="Unit / size" value={unit} onChangeText={setUnit} placeholder="e.g. 700g loaf, 1L, 6 pack" />
          <Field label="Short description" value={detail} onChangeText={setDetail} placeholder="e.g. Sasko, sliced" />

          <Text style={styles.label}>Category</Text>
          <View style={styles.chips}>
            {CATEGORIES.map(c => (
              <TouchableOpacity
                key={c.key}
                style={[styles.chip, category === c.key && styles.chipActive]}
                onPress={() => setCategory(c.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field
            label="Selling price (R)"
            value={price}
            onChangeText={setPrice}
            placeholder="e.g. 17.00"
            keyboardType="decimal-pad"
          />

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Made to order (composite)</Text>
              <Text style={styles.switchHint}>Stock is derived from its recipe components</Text>
            </View>
            <Switch value={isComposite} onValueChange={setIsComposite} trackColor={{ true: colors.primary }} />
          </View>

          {!isComposite && (
            <Field
              label="Opening stock"
              value={stock}
              onChangeText={setStock}
              placeholder="e.g. 10"
              keyboardType="decimal-pad"
            />
          )}

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isNew ? 'Add product' : 'Save changes'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
