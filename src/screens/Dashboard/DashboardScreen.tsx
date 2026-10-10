import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors, spacing, radius, type, shadow, card } from '../../theme/theme'
import { KPI_CARDS, ACTION_ITEMS } from './data/dashboardData'
import { styles } from './styles'

type DashTab = 'action' | 'all'

export default function DashboardScreen() {
  const [tab, setTab] = useState<DashTab>('action')
  const insets = useSafeAreaInsets()

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Dashboard" />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]} showsVerticalScrollIndicator={false}>

        {/* Greeting */}
        <View style={styles.greetRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>Sawubona, Bongani 👋</Text>
            <Text style={styles.greetingSub}>Ready for trade at Bongani Spaza</Text>
          </View>
          <View style={styles.syncPill}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>✓ Synced just now</Text>
          </View>
        </View>

        {/* KPI Cards horizontal scroll */}
        <FlatList
          horizontal
          data={KPI_CARDS}
          keyExtractor={i => i.label}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiList}
          renderItem={({ item }) => (
            <View style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <Text style={styles.kpiLabel}>{item.label}</Text>
                <View style={[styles.kpiIconWrap, { backgroundColor: item.iconBg }]}>
                  <MaterialIcons name={item.iconName} size={15} color={item.iconColor} />
                </View>
              </View>
              <View>
                <Text style={[styles.kpiValue, { color: item.subColor === colors.errorDefault ? colors.errorDefault : colors.textPrimary }]}>
                  {item.value}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 2 }}>
                  {item.subIcon && <MaterialIcons name={item.subIcon} size={13} color={item.subColor} />}
                  <Text style={[styles.kpiSub, { color: item.subColor }]}>{item.sub}</Text>
                </View>
              </View>
            </View>
          )}
        />

        {/* Tabs */}
        <View style={styles.tabRow}>
          <View style={styles.tabBar}>
            <TouchableOpacity
              onPress={() => setTab('action')}
              style={[styles.tab, tab === 'action' && styles.tabActive]}
              activeOpacity={0.8}
            >
              {tab === 'action' && <View style={styles.alertDot} />}
              <Text style={[styles.tabText, tab === 'action' && styles.tabTextActive]}>Action Needed (4)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setTab('all')}
              style={[styles.tab, tab === 'all' && styles.tabActive]}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, tab === 'all' && styles.tabTextActive]}>All Inventory</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.sortBtn} activeOpacity={0.7}>
            <MaterialIcons name="sort" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Inventory list */}
        <View style={styles.list}>
          {ACTION_ITEMS.map(item => (
            <View key={item.id} style={styles.itemCard}>
              <View style={[styles.itemThumb, { backgroundColor: item.rowBg }]}>
                <Image source={{ uri: item.uri }} style={styles.itemImage} />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemVariant}>{item.variant}</Text>
                <Text style={[styles.itemStock, { color: item.stockColor }]}>{item.stockText}</Text>
              </View>
              <View style={styles.itemActions}>
                <View style={[styles.badge, { backgroundColor: item.badgeColor }]}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
                <TouchableOpacity style={styles.orderBtn} activeOpacity={0.7}>
                  <MaterialIcons name="add_shopping_cart" size={14} color={colors.primary} />
                  <Text style={styles.orderBtnText}>Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* All-clear note */}
          <View style={styles.clearNote}>
            <View style={styles.clearIcon}>
              <MaterialIcons name="verified" size={18} color={colors.onPrimary} />
            </View>
            <Text style={styles.clearText}>
              All other 108 staple items are well stocked above buffer safe-levels.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* FAB */}
      <View style={[styles.fab, { bottom: insets.bottom + 80 }]}>
        <TouchableOpacity style={styles.fabBtn} activeOpacity={0.85}>
          <MaterialIcons name="add" size={20} color={colors.onPrimary} />
          <Text style={styles.fabText}>Record Sale</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

