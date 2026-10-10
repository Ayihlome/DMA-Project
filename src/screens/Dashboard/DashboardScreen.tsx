import React from 'react'
import { View, Text, ScrollView, TouchableOpacity } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors } from '../../theme/theme'
import { SUMMARY, LOW_STOCK } from './data/dashboardData'
import { ITEMS as RESTOCK_ITEMS } from '../Restock/data/restockData'
import { styles } from './styles'

const rand = (n: number) => `R${n.toLocaleString('en-ZA')}`

export default function DashboardScreen() {
  const insets = useSafeAreaInsets()
  const change = Math.round(((SUMMARY.salesToday - SUMMARY.salesYesterday) / SUMMARY.salesYesterday) * 100)
  const outSoon = LOW_STOCK.filter(i => i.level === 'out-soon').length

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Today" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sales today: the one number the owner checks first */}
        <View style={styles.salesCard}>
          <Text style={styles.salesLabel}>Sales today</Text>
          <Text style={styles.salesValue}>{rand(SUMMARY.salesToday)}</Text>
          <Text style={styles.salesChange}>
            {change >= 0 ? `${change}% more than yesterday` : `${Math.abs(change)}% less than yesterday`}
          </Text>
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stock value</Text>
            <Text style={styles.statValue}>{rand(SUMMARY.stockValue)}</Text>
            <Text style={styles.statNote}>{SUMMARY.itemCount} items</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Next restock</Text>
            <Text style={styles.statValue}>{SUMMARY.nextRestock}</Text>
            <Text style={styles.statNote}>{RESTOCK_ITEMS.length} items on the list</Text>
          </View>
        </View>

        {/* Running low */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Running low</Text>
          <Text style={styles.sectionNote}>{outSoon} will run out today</Text>
        </View>

        <View style={styles.list}>
          {LOW_STOCK.map((item, i) => {
            const urgent = item.level === 'out-soon'
            return (
              <View key={item.id} style={[styles.row, i > 0 && styles.rowDivider]}>
                <View style={[styles.levelBar, { backgroundColor: urgent ? colors.errorDefault : colors.warningDefault }]} />
                <View style={styles.rowIcon}>
                  <MaterialIcons name={item.icon} size={20} color={colors.primary} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowSize}>{item.size}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.rowLeft, { color: urgent ? colors.errorDefault : colors.warningDefault }]}>
                    {item.left} left
                  </Text>
                  <Text style={styles.rowUnit}>{item.unit}</Text>
                </View>
              </View>
            )
          })}
        </View>

        <TouchableOpacity style={styles.linkRow} onPress={() => router.push('/restock')} activeOpacity={0.7}>
          <Text style={styles.linkText}>See the restock list</Text>
          <MaterialIcons name="chevron_right" size={18} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.footnote}>Everything else is well stocked.</Text>
      </ScrollView>

      {/* Main action, always in reach of the thumb */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 72 }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/sales')} activeOpacity={0.85}>
          <MaterialIcons name="add" size={22} color={colors.onPrimary} />
          <Text style={styles.actionText}>Record a sale</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
