import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { ITEM, SUPPLIERS } from './data/supplyData'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

export default function SupplyScreen() {
  const insets = useSafeAreaInsets()
  const sorted = [...SUPPLIERS].sort((a, b) => a.unitPrice - b.unitPrice)
  const cheapest = sorted[0]
  const [selected, setSelected] = useState(cheapest.id)
  const [saved, setSaved] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)

  const chosen = sorted.find(s => s.id === selected)!
  const priceChange = cheapest.unitPrice - ITEM.priceMonthAgo

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Supplier prices" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 170 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemCard}>
          <View style={styles.itemIcon}>
            <MaterialIcons name="bakery_dining" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{ITEM.name}</Text>
            <Text style={styles.itemPack}>{ITEM.pack}</Text>
          </View>
        </View>

        <Text style={styles.summary}>
          Cheapest is <Text style={styles.summaryStrong}>{cheapest.name}</Text> at {rand(cheapest.unitPrice)} a loaf.
          {' '}
          {priceChange < 0
            ? `That's ${rand(Math.abs(priceChange))} less than a month ago.`
            : `That's ${rand(priceChange)} more than a month ago.`}
        </Text>

        <View style={styles.list}>
          {sorted.map((s, i) => {
            const isSelected = selected === s.id
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
                    {s.distance} away · min {s.minOrder} · updated {s.updated}
                  </Text>
                  {s.note && <Text style={styles.supplierNote}>{s.note}</Text>}
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

        <Text style={styles.listNote}>Price per loaf. A crate from {chosen.name} costs {rand(chosen.unitPrice * ITEM.unitsPerPack)}.</Text>

        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addBtn} activeOpacity={0.7}>
          <MaterialIcons name="add" size={20} color={colors.primary} />
          <Text style={styles.addText}>Add a new price</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 72 }]}>
        <TouchableOpacity
          onPress={() => setSaved(true)}
          style={[styles.actionBtn, saved && styles.actionBtnDone]}
          activeOpacity={0.85}
        >
          {saved && <MaterialIcons name="check" size={20} color={colors.onPrimary} />}
          <Text style={styles.actionText} numberOfLines={1}>
            {saved ? `Buying from ${chosen.name}` : `Buy from ${chosen.name}`}
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
            <TextInput style={styles.input} placeholder="e.g. Cambridge Food" placeholderTextColor={colors.textSecondary} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Crate price (R)</Text>
                <TextInput style={styles.input} placeholder="135.00" keyboardType="decimal-pad" placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Loaves per crate</Text>
                <TextInput style={styles.input} defaultValue="10" keyboardType="number-pad" placeholderTextColor={colors.textSecondary} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.actionBtn}>
              <Text style={styles.actionText}>Save price</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}
