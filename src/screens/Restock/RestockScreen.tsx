import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { ITEMS, REGULAR_STOCK } from './data/restockData'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

export default function RestockScreen() {
  const insets = useSafeAreaInsets()
  const [budget, setBudget] = useState('2500')
  const [checked, setChecked] = useState<Set<number>>(new Set(ITEMS.map(i => i.id)))
  // index into each item's supplier list; 0 = cheapest
  const [supplierFor, setSupplierFor] = useState<Record<number, number>>({})
  const [openSupplier, setOpenSupplier] = useState<number | null>(null)
  const [openWhy, setOpenWhy] = useState<number | null>(null)
  const [saved, setSaved] = useState(false)

  const costOf = (id: number) => {
    const item = ITEMS.find(i => i.id === id)!
    return item.qty * item.suppliers[supplierFor[id] ?? 0].unitPrice
  }
  const itemsCost = ITEMS.filter(i => checked.has(i.id)).reduce((s, i) => s + costOf(i.id), 0)
  const total = REGULAR_STOCK + itemsCost
  const budgetNum = parseFloat(budget) || 0
  const left = budgetNum - total
  const withinBudget = left >= 0
  const pct = budgetNum > 0 ? Math.min(100, (total / budgetNum) * 100) : 100

  function toggle(id: number) {
    setSaved(false)
    setChecked(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function pickSupplier(id: number, index: number) {
    setSaved(false)
    setSupplierFor(s => ({ ...s, [id]: index }))
    setOpenSupplier(null)
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Restock" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 190 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.intro}>
          {ITEMS.length} items are running low. Untick anything you don&apos;t want to buy this time.
        </Text>

        {/* Budget */}
        <View style={styles.budgetCard}>
          <View style={styles.budgetRow}>
            <Text style={styles.budgetLabel}>Budget</Text>
            <View style={styles.budgetInputWrap}>
              <Text style={styles.budgetCurrency}>R</Text>
              <TextInput
                style={styles.budgetInput}
                value={budget}
                onChangeText={t => { setBudget(t.replace(/[^0-9.]/g, '')); setSaved(false) }}
                keyboardType="decimal-pad"
                accessibilityLabel="Restock budget in rand"
              />
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: withinBudget ? colors.secondary : colors.errorDefault }]} />
          </View>
          <Text style={[styles.budgetStatus, { color: withinBudget ? colors.secondary : colors.errorDefault }]}>
            {withinBudget ? `${rand(left)} left after this order` : `${rand(-left)} over budget. Untick an item or raise the budget.`}
          </Text>
        </View>

        {/* Items */}
        <View style={styles.list}>
          {ITEMS.map((item, i) => {
            const on = checked.has(item.id)
            const supplier = item.suppliers[supplierFor[item.id] ?? 0]
            const urgent = item.level === 'out-soon'
            return (
              <View key={item.id} style={[styles.item, i > 0 && styles.itemDivider]}>
                <View style={styles.itemTop}>
                  <TouchableOpacity
                    onPress={() => toggle(item.id)}
                    style={styles.checkHit}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Buy ${item.name}`}
                  >
                    <View style={[styles.checkbox, on && styles.checkboxOn]}>
                      {on && <MaterialIcons name="check" size={16} color={colors.onPrimary} />}
                    </View>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, !on && styles.itemOff]}>{item.name}</Text>
                    <Text style={styles.itemQty}>
                      Buy {item.qty} {item.unit} ({item.packs})
                    </Text>
                    <Text style={[styles.itemLevel, { color: urgent ? colors.errorDefault : colors.warningDefault }]}>
                      {urgent ? 'Runs out today' : 'Running low'}
                    </Text>
                  </View>
                  <Text style={[styles.itemCost, !on && styles.itemOff]}>{rand(costOf(item.id))}</Text>
                </View>

                <View style={styles.itemBottom}>
                  <Text style={styles.supplierText} numberOfLines={1}>
                    {supplier.name} · {rand(supplier.unitPrice)} each
                  </Text>
                  <TouchableOpacity onPress={() => setOpenSupplier(openSupplier === item.id ? null : item.id)} style={styles.linkHit}>
                    <Text style={styles.link}>{openSupplier === item.id ? 'Close' : 'Change'}</Text>
                  </TouchableOpacity>
                </View>

                {openSupplier === item.id && (
                  <View style={styles.options}>
                    {item.suppliers.map((s, idx) => {
                      const picked = (supplierFor[item.id] ?? 0) === idx
                      return (
                        <TouchableOpacity key={s.name} onPress={() => pickSupplier(item.id, idx)} style={styles.option} activeOpacity={0.7}>
                          <View style={[styles.radio, picked && styles.radioOn]}>
                            {picked && <View style={styles.radioDot} />}
                          </View>
                          <Text style={styles.optionName}>{s.name}</Text>
                          <Text style={[styles.optionPrice, idx === 0 && { color: colors.secondary }]}>
                            {rand(s.unitPrice)}{idx === 0 ? ' cheapest' : ''}
                          </Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>
                )}

                <TouchableOpacity onPress={() => setOpenWhy(openWhy === item.id ? null : item.id)} style={styles.whyToggle}>
                  <Text style={styles.link}>Why this item?</Text>
                  <MaterialIcons name={openWhy === item.id ? 'expand_less' : 'expand_more'} size={18} color={colors.primary} />
                </TouchableOpacity>
                {openWhy === item.id && <Text style={styles.why}>{item.why}</Text>}
              </View>
            )
          })}
          <View style={[styles.item, styles.itemDivider, styles.regularRow]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>Regular weekly stock</Text>
              <Text style={styles.itemQty}>Cold drinks, airtime, cigarettes</Text>
            </View>
            <Text style={styles.itemCost}>{rand(REGULAR_STOCK)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 72 }]}>
        <View style={styles.footerRow}>
          <Text style={styles.footerLabel}>
            {checked.size} {checked.size === 1 ? 'item' : 'items'} + regular stock
          </Text>
          <Text style={styles.footerTotal}>{rand(total)}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setSaved(true)}
          disabled={!withinBudget}
          style={[styles.saveBtn, !withinBudget && styles.saveBtnOff, saved && styles.saveBtnDone]}
          activeOpacity={0.85}
        >
          {saved && <MaterialIcons name="check" size={20} color={colors.onPrimary} />}
          <Text style={styles.saveText}>
            {saved ? 'Restock list saved' : withinBudget ? 'Save restock list' : 'Over budget'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
