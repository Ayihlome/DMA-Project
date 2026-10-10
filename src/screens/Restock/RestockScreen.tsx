import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'

import { BASE_OVERHEAD, ITEMS } from './data/restockData'
import { styles } from './styles'

export default function RestockScreen() {
  const insets = useSafeAreaInsets()
  const [budget, setBudget] = useState(2500)
  const [checked, setChecked] = useState<Set<number>>(new Set([1, 2, 3]))
  const [openAccordion, setOpenAccordion] = useState<Set<number>>(new Set([1]))
  const [openSupplier, setOpenSupplier] = useState<Set<number>>(new Set())
  const [orderState, setOrderState] = useState<'idle' | 'loading' | 'done'>('idle')

  const selectedCost = ITEMS.filter(i => checked.has(i.id)).reduce((s, i) => s + i.cost, 0)
  const totalCost = BASE_OVERHEAD + selectedCost
  const diff = budget - totalCost
  const pct = budget > 0 ? Math.min(100, (totalCost / budget) * 100) : 100
  const withinBudget = diff >= 0

  function toggleCheck(id: number) {
    setChecked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleAccordion(id: number) {
    setOpenAccordion(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSupplier(id: number) {
    setOpenSupplier(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function submitOrder() {
    if (!withinBudget) return
    setOrderState('loading')
    setTimeout(() => setOrderState('done'), 900)
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Restock" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <MaterialIcons name="psychology" size={20} color={colors.primary} />
            <Text style={styles.bannerTitle}>Optimized Restock Plan</Text>
          </View>
          <View style={styles.smartBadge}>
            <MaterialIcons name="auto_awesome" size={14} color={colors.primary} />
            <Text style={styles.smartBadgeText}>Smart Batch</Text>
          </View>
        </View>
        <Text style={styles.bannerSub}>Prioritized by sales run-out risk and best wholesale unit price.</Text>

        {/* Budget Card */}
        <View style={[card.base, { marginHorizontal: spacing.md, marginBottom: spacing.md }]}>
          <View style={styles.budgetRow}>
            <View>
              <Text style={styles.budgetLabel}>Available Restock Budget</Text>
              <View style={styles.budgetInputRow}>
                <Text style={styles.budgetCurrency}>R</Text>
                <TextInput
                  style={styles.budgetInput}
                  value={String(budget)}
                  keyboardType="numeric"
                  onChangeText={t => setBudget(parseFloat(t) || 0)}
                />
                <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.budgetLabel}>Allocated</Text>
              <Text style={styles.allocatedValue}>R{totalCost.toFixed(2)}</Text>
              <Text style={styles.pctText}>({pct.toFixed(0)}% used)</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: withinBudget ? colors.secondary : colors.errorDefault }]} />
          </View>

          <View style={styles.bufferRow}>
            <View style={[styles.bufferPill, { backgroundColor: withinBudget ? colors.successTint : colors.errorTint }]}>
              <MaterialIcons name={withinBudget ? 'check_circle' : 'warning'} size={16} color={withinBudget ? colors.secondary : colors.errorDefault} />
              <Text style={[styles.bufferText, { color: withinBudget ? colors.secondary : colors.errorDefault }]}>
                {withinBudget ? `R${diff.toFixed(2)} remaining buffer` : `R${Math.abs(diff).toFixed(2)} over budget`}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setBudget(b => b + 500)}>
              <Text style={styles.quickAdd}>+R500 buffer</Text>
            </TouchableOpacity>
          </View>

          {!withinBudget && (
            <View style={styles.overbudgetWarning}>
              <MaterialIcons name="error" size={18} color={colors.errorDefault} />
              <Text style={styles.overbudgetText}>Budget exceeded. Remove items or raise budget to enable ordering.</Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.itemsHeader}>
          <Text style={styles.itemsTitle}>Recommended Items ({ITEMS.length})</Text>
          <Text style={styles.itemsHint}>Sorted by stockout urgency</Text>
        </View>

        <View style={styles.itemList}>
          {ITEMS.map(item => (
            <View key={item.id} style={[card.base, { marginHorizontal: spacing.md }]}>
              <View style={styles.itemTopRow}>
                {/* Checkbox */}
                <TouchableOpacity onPress={() => toggleCheck(item.id)} style={styles.checkbox}>
                  <View style={[styles.checkboxBox, checked.has(item.id) && styles.checkboxChecked]}>
                    {checked.has(item.id) && <MaterialIcons name="check" size={14} color={colors.onPrimary} />}
                  </View>
                </TouchableOpacity>

                <View style={{ flex: 1 }}>
                  {/* Badge + cost */}
                  <View style={styles.badgeCostRow}>
                    <View style={[styles.itemBadge, { backgroundColor: item.badgeBg }]}>
                      <MaterialIcons name={item.badgeIcon as any} size={12} color={colors.onPrimary} />
                      <Text style={styles.itemBadgeText}>{item.badge}</Text>
                    </View>
                    <Text style={styles.itemCost}>R{item.cost.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDesc}>{item.desc}</Text>

                  {/* Supplier row */}
                  <View style={styles.supplierRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <MaterialIcons name="storefront" size={16} color={colors.secondary} />
                      <Text style={styles.supplierName} numberOfLines={1}>{item.supplier}</Text>
                      <Text style={styles.supplierPrice}> · {item.supplierPrice}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleSupplier(item.id)}>
                      <Text style={styles.changeBtn}>{openSupplier.has(item.id) ? 'Done' : 'Change'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Supplier switcher */}
                  {openSupplier.has(item.id) && (
                    <View style={styles.supplierSwitcher}>
                      <Text style={styles.compareLabel}>Compare Wholesalers:</Text>
                      {item.suppliers.map((s, idx) => (
                        <View key={s.name} style={styles.supplierOption}>
                          <View style={[styles.radioCircle, idx === 0 && styles.radioCircleActive]}>
                            {idx === 0 && <View style={styles.radioInner} />}
                          </View>
                          <Text style={styles.supplierOptionName}>{s.name}</Text>
                          <Text style={[styles.supplierOptionPrice, idx === 0 && { color: colors.secondary, fontWeight: '700' }]}>
                            {s.price}{s.diff ? ` (${s.diff})` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Accordion */}
                  <TouchableOpacity onPress={() => toggleAccordion(item.id)} style={styles.accordionToggle}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MaterialIcons name="info" size={16} color={colors.primary} />
                      <Text style={styles.accordionLabel}>Why this item?</Text>
                    </View>
                    <MaterialIcons
                      name={openAccordion.has(item.id) ? 'expand_less' : 'expand_more'}
                      size={18}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {openAccordion.has(item.id) && (
                    <View style={styles.rationaleBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <MaterialIcons name={item.rationale.icon as any} size={14} color={colors.errorDefault} />
                        <Text style={styles.rationaleUrgent}>{item.rationale.urgent}</Text>
                      </View>
                      <Text style={styles.rationaleBody}>{item.rationale.body}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}

          {/* Add custom item */}
          <TouchableOpacity style={styles.addCustom} activeOpacity={0.8}>
            <MaterialIcons name="add_circle" size={20} color={colors.textSecondary} />
            <Text style={styles.addCustomText}>Add another custom item</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 72 }]}>
        <View style={styles.footerSummary}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.footerCount}>{checked.size + 1} items selected</Text>
            <Text style={styles.footerDot}>·</Text>
            <Text style={styles.footerTotal}>R{totalCost.toFixed(2)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MaterialIcons name={withinBudget ? 'verified' : 'error'} size={14} color={withinBudget ? colors.secondary : colors.errorDefault} />
            <Text style={[styles.footerStatus, { color: withinBudget ? colors.secondary : colors.errorDefault }]}>
              {withinBudget ? 'Within budget' : 'Exceeds limit'}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={submitOrder}
          disabled={!withinBudget || orderState === 'loading'}
          style={[
            styles.orderBtn,
            !withinBudget && styles.orderBtnDisabled,
            orderState === 'done' && styles.orderBtnDone,
          ]}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name={orderState === 'done' ? 'task_alt' : !withinBudget ? 'block' : 'shopping_bag'}
            size={20}
            color={colors.onPrimary}
          />
          <Text style={styles.orderBtnText}>
            {orderState === 'loading' ? 'Routing to suppliers...' :
             orderState === 'done' ? 'Orders Sent via WhatsApp!' :
             !withinBudget ? 'Budget Exceeded' : 'Create Restock Order'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

