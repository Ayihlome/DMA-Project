import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { REGULAR_STOCK } from './data/restockData'
import { useCases } from '../../backend/useCases/container'
import { useUseCase } from '../../hooks/use-use-case'
import { toRestockItems, type PlanRecommendation, type RestockLine } from './data/restockLines'
import { Loading, LoadError } from '../../components/common/ScreenState'
import { styles } from './styles'

const rand = (n: number) => `R${n.toFixed(2)}`

export default function RestockScreen() {
  const { data, error, reload } = useUseCase(async () => {
    const plan = await useCases.generateRestockPlan({ budget: 0 })
    return toRestockItems(plan.recommendations as PlanRecommendation[])
  })
  if (!data) {
    return (
      <View style={styles.screen}>
        <AppHeader screenLabel="Restock" />
        {error ? <LoadError message={error} onRetry={reload} /> : <Loading />}
      </View>
    )
  }
  return <RestockList items={data} />
}

function RestockList({ items: ITEMS }: { items: RestockLine[] }) {
  const insets = useSafeAreaInsets()
  const [budget, setBudget] = useState('2500')
  // Items the owner unticked; everything else is bought, including items that turn up later.
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  // supplier chosen per item (by id); none chosen = the cheapest, which is first
  const [supplierFor, setSupplierFor] = useState<Record<string, string>>({})
  const [openSupplier, setOpenSupplier] = useState<string | null>(null)
  const [openWhy, setOpenWhy] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const checked = new Set(ITEMS.filter(i => !skipped.has(i.id)).map(i => i.id))
  const supplierOf = (item: RestockLine) => item.suppliers.find(s => s.id === supplierFor[item.id]) ?? item.suppliers[0]
  const costOf = (id: string) => {
    const item = ITEMS.find(i => i.id === id)!
    return item.qty * supplierOf(item).unitPrice
  }
  const itemsCost = ITEMS.filter(i => checked.has(i.id)).reduce((s, i) => s + costOf(i.id), 0)
  const total = REGULAR_STOCK + itemsCost
  const budgetNum = parseFloat(budget) || 0
  const left = budgetNum - total
  const withinBudget = left >= 0
  const pct = budgetNum > 0 ? Math.min(100, (total / budgetNum) * 100) : 100

  function toggle(id: string) {
    setSaved(false)
    setSkipped(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function pickSupplier(id: string, supplierId: string) {
    setSaved(false)
    setSupplierFor(s => ({ ...s, [id]: supplierId }))
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
          {ITEMS.length === 0
            ? 'Nothing needs restocking right now. Items with a saved supplier price show up here when they run low.'
            : `${ITEMS.length} ${ITEMS.length === 1 ? 'item is' : 'items are'} running low. Untick anything you don't want to buy this time.`}
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
            const supplier = supplierOf(item)
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
                      const picked = supplier.id === s.id
                      return (
                        <TouchableOpacity key={s.id} onPress={() => pickSupplier(item.id, s.id)} style={styles.option} activeOpacity={0.7}>
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
