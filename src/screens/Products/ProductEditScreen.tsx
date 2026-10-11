import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors } from '../../theme/theme'
import { useCases } from '../../backend/useCases/container'
import { useUseCase } from '../../hooks/use-use-case'
import type { SellableProduct } from '../Sales/data/productCards'
import { Loading } from '../../components/common/ScreenState'
import { CATEGORIES } from '../../data/types'
import type { CategoryKey } from '../../data/types'
import { Field } from '../Auth/AuthForm'
import { styles } from './styles'

// '' stays NaN instead of becoming 0; decimal comma accepted
const parseNumber = (s: string) => (s.trim() === '' ? NaN : Number(s.trim().replace(',', '.')))

/** One ingredient line of a recipe, as getRecipe answers. */
type RecipeLine = { componentProductID: string; name: string; unit: string; quantityRequired: number }

export default function ProductEditScreen() {
  const { id = 'new' } = useLocalSearchParams<{ id: string }>()
  const { data } = useUseCase<SellableProduct[]>(() => useCases.getSellableProducts({}))
  const recipe = useUseCase<RecipeLine[]>(
    () => (id === 'new' ? Promise.resolve([]) : useCases.getRecipe({ productID: id })),
    [id],
  )

  // Wait for the saved product and its recipe before drawing the form, so its fields start with the right values.
  if (id !== 'new' && (!data || !recipe.data)) return <Loading />
  const existing = id !== 'new' ? data?.find(p => p.id === id) : undefined
  return <ProductForm key={existing?.id ?? 'new'} existing={existing} products={data ?? []} recipe={recipe.data ?? []} />
}

function ProductForm({ existing, products, recipe }: { existing?: SellableProduct; products: SellableProduct[]; recipe: RecipeLine[] }) {
  const insets = useSafeAreaInsets()

  const [name, setName] = useState(existing?.name ?? '')
  const [unit, setUnit] = useState(existing?.unit ?? '')
  const [category, setCategory] = useState<CategoryKey>((existing?.category as CategoryKey | null) ?? 'pantry')
  const [price, setPrice] = useState(existing ? String(existing.selling_price) : '')
  const [stock, setStock] = useState(existing ? String(existing.stockOnHand) : '0')
  const [isComposite, setIsComposite] = useState(!!existing?.is_composite)
  const [packSize, setPackSize] = useState(existing ? String(existing.pack_size) : '1')

  // How much of each ingredient one sale uses, by ingredient id ('' = not used).
  const [amounts, setAmounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(recipe.map(r => [r.componentProductID, String(r.quantityRequired)])),
  )
  // Set once a new product is saved, so saving again edits it instead of adding a second one.
  const [createdId, setCreatedId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isNew = !existing
  // Ingredients are the products that are not made to order (plus any already in this recipe).
  const ingredients = products.filter(
    p => p.id !== existing?.id && (!p.is_composite || recipe.some(r => r.componentProductID === p.id)),
  )

  async function save() {
    const priceVal = parseNumber(price)
    const stockVal = parseNumber(stock)
    const packVal = parseNumber(packSize)

    if (!name.trim()) { setError('Give the product a name.'); return }
    if (!unit.trim()) { setError('Add a unit (e.g. 1L, 6 pack).'); return }
    if (isNaN(priceVal) || priceVal < 0) { setError('Enter a valid selling price.'); return }
    if (!isComposite && (isNaN(stockVal) || stockVal < 0)) { setError('Enter a valid stock amount.'); return }

    const recipeLines = isComposite
      ? ingredients
          .map(p => ({ componentProductID: p.id, quantityRequired: parseNumber(amounts[p.id] ?? '') }))
          .filter(line => !isNaN(line.quantityRequired))
      : []
    if (isComposite && recipeLines.length === 0) { setError('Add at least one ingredient to the recipe.'); return }
    if (recipeLines.some(line => line.quantityRequired <= 0)) { setError('Recipe amounts must be more than 0.'); return }

    setSaving(true)
    setError(null)

    try {
      const packSizeValue = isNaN(packVal) || packVal <= 0 ? 1 : packVal
      const productId = existing?.id ?? createdId
      const result = productId
        ? await useCases.updateProduct({
            productID: productId,
            name: name.trim(),
            unit: unit.trim(),
            sellingPrice: priceVal,
            category,
            packSize: packSizeValue,
            stockOnHand: isComposite ? undefined : stockVal,
          })
        : await useCases.createProduct({
            name: name.trim(),
            unit: unit.trim(),
            isComposite,
            sellingPrice: priceVal,
            category,
            packSize: packSizeValue,
            openingStock: isComposite ? 0 : stockVal,
          })
      if (!result.success) {
        setError(result.errors.join(' '))
        return
      }

      const savedId: string = productId ?? result.product.id
      const before = new Map(recipe.map(r => [r.componentProductID, r.quantityRequired]))
      const recipeUnchanged =
        !!existing && before.size === recipeLines.length && recipeLines.every(l => before.get(l.componentProductID) === l.quantityRequired)
      if (isComposite && !recipeUnchanged) {
        const recipeResult = await useCases.setRecipeComponents({ parentProductID: savedId, components: recipeLines })
        if (!recipeResult.success) {
          setCreatedId(savedId)
          setError(`The product was saved, but the recipe was not: ${recipeResult.errors.join(' ')}`)
          return
        }
      }
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
            <Switch value={isComposite} onValueChange={setIsComposite} disabled={!isNew} trackColor={{ true: colors.primary }} />
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

          {isComposite && (
            <View style={styles.recipeBox}>
              <Text style={styles.label}>Recipe: how much of each ingredient one sale uses</Text>
              {ingredients.length === 0 ? (
                <Text style={styles.hint}>Add your ingredients as normal products first (for example bread or polony), then come back to set the recipe.</Text>
              ) : (
                ingredients.map(p => (
                  <View key={p.id} style={styles.recipeRow}>
                    <View style={styles.recipeName}>
                      <Text style={styles.rowName}>{p.name}</Text>
                      <Text style={styles.rowMeta}>{p.unit}</Text>
                    </View>
                    <TextInput
                      style={styles.recipeInput}
                      value={amounts[p.id] ?? ''}
                      onChangeText={t => setAmounts(a => ({ ...a, [p.id]: t }))}
                      placeholder="0"
                      placeholderTextColor={colors.textSecondary}
                      keyboardType="decimal-pad"
                      accessibilityLabel={`Amount of ${p.name} used per sale`}
                    />
                  </View>
                ))
              )}
            </View>
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