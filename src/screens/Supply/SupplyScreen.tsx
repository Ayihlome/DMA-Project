import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

import { SUPPLIERS, type SupplierID } from './data/supplyData'
import { styles } from './styles'

export default function SupplyScreen() {
  const insets = useSafeAreaInsets()
  const [selected, setSelected] = useState<SupplierID>('jumbo')
  const [modalVisible, setModalVisible] = useState(false)
  const [applied, setApplied] = useState(false)

  function applySupplier() {
    setApplied(true)
    setTimeout(() => setApplied(false), 1800)
  }

  const selectedSupplier = SUPPLIERS.find(s => s.id === selected)!

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Supply" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Selector */}
        <View style={[card.base, { marginHorizontal: spacing.md, marginTop: spacing.sm }]}>
          <Text style={styles.sectionLabel}>ITEM FOR COMPARISON</Text>
          <View style={styles.itemRow}>
            <View style={styles.itemIcon}>
              <MaterialIcons name="bakery_dining" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>Albany White Bread 700g</Text>
              <Text style={styles.itemVariant}>Standard Crate of 10 Loaves</Text>
            </View>
            <TouchableOpacity style={styles.swapBtn} activeOpacity={0.7}>
              <MaterialIcons name="swap_horiz" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MaterialIcons name="trending_down" size={18} color={colors.secondary} />
              <View>
                <Text style={styles.statLabel}>Lowest Unit</Text>
                <Text style={styles.statValue}>R13.20 <Text style={styles.statUnit}>/ loaf</Text></Text>
              </View>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="savings" size={18} color={colors.primary} />
              <View>
                <Text style={styles.statLabel}>Potential Save</Text>
                <Text style={[styles.statValue, { color: colors.secondary }]}>R13.00 <Text style={styles.statUnit}>/ 10-pack</Text></Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.sectionTitle}>Wholesale Quotations</Text>
            <View style={styles.countPill}>
              <Text style={styles.countPillText}>3 available</Text>
            </View>
          </View>
          <Text style={styles.sectionHint}>Sorted by unit price</Text>
        </View>

        {/* Supplier cards */}
        <View style={styles.cardList}>
          {SUPPLIERS.map(s => {
            const isSelected = selected === s.id
            return (
              <TouchableOpacity key={s.id} onPress={() => setSelected(s.id)} style={[card.base, { marginHorizontal: spacing.md }]} activeOpacity={0.85}>
                {/* Badge + radio row */}
                <View style={styles.cardTopRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <View style={[styles.supplierBadge, { backgroundColor: s.badgeBg }]}>
                      {s.id === 'jumbo' && <MaterialIcons name="verified" size={12} color={s.badgeTextColor} />}
                      <Text style={[styles.supplierBadgeText, { color: s.badgeTextColor }]}>{s.badge}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <MaterialIcons name="schedule" size={12} color={colors.textSecondary} />
                      <Text style={styles.timestamp}>{s.timestamp}</Text>
                    </View>
                  </View>
                  <View style={[styles.radio, isSelected && styles.radioActive]}>
                    {isSelected && <MaterialIcons name="check" size={14} color={colors.onPrimary} />}
                  </View>
                </View>

                {/* Name + Price */}
                <View style={styles.namePriceRow}>
                  <Text style={styles.supplierName} numberOfLines={1}>{s.name}</Text>
                  <Text style={styles.supplierPrice}>R{s.price.toFixed(2)} <Text style={styles.perUnit}>/ loaf</Text></Text>
                </View>

                {/* Pack + min */}
                <View style={styles.packRow}>
                  <Text style={styles.packText}>Pack of 10: <Text style={styles.packValue}>R{s.packPrice.toFixed(2)}</Text></Text>
                  <View style={styles.minPill}>
                    <Text style={styles.minText}>{s.minOrder}</Text>
                  </View>
                </View>

                {/* Jumbo extras */}
                {s.id === 'jumbo' && s.location && (
                  <View style={styles.deliveryRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="location_on" size={15} color={colors.primary} />
                      <Text style={styles.deliveryText}>{s.location}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="local_shipping" size={15} color={colors.secondary} />
                      <Text style={styles.deliveryText}>{s.delivery}</Text>
                    </View>
                  </View>
                )}

                {s.priceDelta && (
                  <View style={styles.deltaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="arrow_upward" size={14} color={colors.textSecondary} />
                      <Text style={styles.deltaText}>{s.priceDelta}</Text>
                    </View>
                    {s.distance && <Text style={styles.deltaText}>{s.distance}</Text>}
                  </View>
                )}

                {s.warning && (
                  <View style={styles.warningBox}>
                    <MaterialIcons name="warning" size={18} color="#DD6B20" />
                    <Text style={styles.warningText}>{s.warning}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )
          })}

          {/* Add supplier placeholder */}
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.addPlaceholder}
            activeOpacity={0.8}
          >
            <View style={styles.addPlaceholderIcon}>
              <MaterialIcons name="add_circle" size={24} color={colors.primary} />
            </View>
            <Text style={styles.addPlaceholderTitle}>+ Add new supplier price</Text>
            <Text style={styles.addPlaceholderSub}>Log quote or invoice from local distributor</Text>
          </TouchableOpacity>
        </View>

        {/* Sparkline card */}
        <View style={[card.base, { marginHorizontal: spacing.md, marginTop: spacing.sm }]}>
          <View style={styles.trendHeader}>
            <Text style={styles.trendTitle}>30-Day Price Trend (Albany 700g)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <MaterialIcons name="south_east" size={16} color={colors.secondary} />
              <Text style={styles.trendDelta}>-4.3%</Text>
            </View>
          </View>
          <View style={styles.sparkline}>
            {[
              { left: '0%', top: 14, width: '13.5%', rotate: '4deg' },
              { left: '13.3%', top: 17, width: '13.5%', rotate: '-8deg' },
              { left: '26.6%', top: 11, width: '13.5%', rotate: '14deg' },
              { left: '39.9%', top: 21, width: '13.5%', rotate: '-4deg' },
              { left: '53.2%', top: 18, width: '13.5%', rotate: '12deg' },
              { left: '66.5%', top: 27, width: '13.5%', rotate: '-4deg' },
              { left: '79.8%', top: 24, width: '20%', rotate: '10deg' },
            ].map((segment, index) => (
              <View
                key={index}
                style={{
                  position: 'absolute',
                  left: segment.left as any,
                  top: segment.top,
                  width: segment.width as any,
                  height: 2.5,
                  backgroundColor: '#319795',
                  borderRadius: 2,
                  transform: [{ rotate: segment.rotate }],
                }}
              />
            ))}
            <View
              style={{
                position: 'absolute',
                right: 0,
                top: 31,
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: '#2F855A',
              }}
            />
          </View>
          <View style={styles.trendFooter}>
            <Text style={styles.trendFooterText}>1 Month Ago: R13.80</Text>
            <Text style={styles.trendFooterText}>Current Best: R13.20</Text>
          </View>
        </View>

        {/* Apply button */}
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <TouchableOpacity
            onPress={applySupplier}
            style={[styles.applyBtn, applied && styles.applyBtnSuccess]}
            activeOpacity={0.85}
          >
            <MaterialIcons name={applied ? 'check' : 'check_circle'} size={20} color={colors.onPrimary} />
            <Text style={styles.applyBtnText}>
              {applied ? 'Saved to Restock List' : `Apply ${selectedSupplier.name} to Restock Plan`}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Price Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.md }]} activeOpacity={1}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Supplier Price</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <MaterialIcons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inputLabel}>Distributor / Supplier Name</Text>
            <TextInput style={styles.input} placeholder="e.g. Cambridge Food / Local Depot" placeholderTextColor={colors.textSecondary} />
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Pack Price (R)</Text>
                <TextInput style={styles.input} placeholder="135.00" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>Units Per Pack</Text>
                <TextInput style={styles.input} defaultValue="10" keyboardType="numeric" placeholderTextColor={colors.textSecondary} />
              </View>
            </View>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.applyBtn}>
              <Text style={styles.applyBtnText}>Save & Compare</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

