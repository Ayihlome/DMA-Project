import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import { colors } from '../../theme/theme'
import { useCases } from '../../backend/useCases/container'
import { useUseCase } from '../../hooks/use-use-case'
import type { SellableProduct } from '../Sales/data/productCards'
import { Loading, LoadError } from '../../components/common/ScreenState'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

function statusText(p: SellableProduct) {
  if (p.is_composite) {
    if (!p.hasRecipe) return { text: 'Needs a recipe', warn: true }
    return { text: 'Made to order' }
  }
  return { text: `${p.stockOnHand} in stock`, warn: p.stockOnHand < 5 }
}

export default function ProductsScreen() {
  const insets = useSafeAreaInsets()
  const { data, error, reload } = useUseCase<SellableProduct[]>(() => useCases.getSellableProducts({}))
  const products = [...(data ?? [])].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.inner}>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push({ pathname: '/products/[id]', params: { id: 'new' } })} activeOpacity={0.85}>
          <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.addText}>Add a product</Text>
        </TouchableOpacity>

        {!data && (error ? <LoadError message={error} onRetry={reload} /> : <Loading />)}

        {data && products.length === 0 && (
          <Text style={styles.hint}>No products yet. Add the first thing you sell.</Text>
        )}

        {products.length > 0 && (
          <View style={styles.list}>
            {products.map((p, i) => {
              const s = statusText(p)
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.row, i === 0 && styles.rowFirst]}
                  onPress={() => router.push({ pathname: '/products/[id]', params: { id: p.id } })}
                  activeOpacity={0.7}
                  accessibilityLabel={`Edit ${p.name}`}
                >
                  <View style={styles.rowIcon}>
                    <MaterialIcons name="inventory_2" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{p.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>
                      {p.unit} · {rand(p.selling_price)}
                    </Text>
                  </View>
                  <Text style={[styles.rowStatus, s.warn && styles.rowWarn]}>{s.text}</Text>
                  <MaterialIcons name="chevron_right" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
