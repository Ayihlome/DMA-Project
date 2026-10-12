import React from 'react'
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Logo from '../../components/brand/Logo'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import { colors, fonts, money, radius, space, tabular, type } from '../../theme/tokens'
import { draftTotal, type Draft } from './sellModel'

/**
 * Black header: yellow mark, "Sell", Edit grid and search. Under it, the sale
 * tabs — the sale being rung up is the yellow "Now" pill, parked sales are dark
 * pills, and the dashed "+ New" parks the current one and starts another.
 */
export default function SellHeader({
  drafts,
  activeId,
  onSwitch,
  onNew,
  onEditGrid,
  editing,
  searching,
  query,
  onToggleSearch,
  onQuery,
}: {
  drafts: Draft[]
  activeId: string
  onSwitch: (id: string) => void
  onNew: () => void
  onEditGrid: () => void
  /** In edit mode the button reads "Done" and search steps aside. */
  editing: boolean
  searching: boolean
  query: string
  onToggleSearch: () => void
  onQuery: (q: string) => void
}) {
  const insets = useSafeAreaInsets()
  const active = drafts.find((d) => d.id === activeId)

  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.top}>
        <Logo size={30} stroke={colors.brand} strokeWidth={8} />
        <Text style={styles.title} accessibilityRole="header">
          Sell
        </Text>
        <PressableScale
          onPress={onEditGrid}
          accessibilityLabel={editing ? 'Done editing the grid' : 'Edit grid'}
          style={[styles.textButton, editing && styles.textButtonOn]}
        >
          <Text style={[styles.textButtonLabel, editing && styles.textButtonLabelOn]}>{editing ? 'Done' : 'Edit grid'}</Text>
        </PressableScale>
        {editing ? null : (
          <PressableScale
            onPress={onToggleSearch}
            accessibilityLabel={searching ? 'Close search' : 'Search products'}
            style={[styles.iconButton, searching && styles.iconButtonOn]}
          >
            <MaterialIcon name={searching ? 'close' : 'search'} size={20} color={searching ? colors.ink : colors.brand} />
          </PressableScale>
        )}
      </View>

      {searching && !editing ? (
        <View style={styles.search}>
          <MaterialIcon name="search" size={18} color="rgba(255,255,255,0.56)" />
          <TextInput
            value={query}
            onChangeText={onQuery}
            autoFocus
            style={styles.searchInput}
            placeholder="Search products"
            placeholderTextColor="rgba(255,255,255,0.56)"
            accessibilityLabel="Search products"
            returnKeyType="search"
            autoCorrect={false}
          />
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {drafts.map((d) => {
          const on = d.id === activeId
          const label = `${on ? 'Now' : `Sale ${d.n}`} · ${money(draftTotal(d))}`
          return (
            <PressableScale
              key={d.id}
              onPress={() => onSwitch(d.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              style={[styles.tab, on ? styles.tabOn : styles.tabParked]}
              hitSlop={4}
            >
              <Text style={[styles.tabText, on && styles.tabTextOn]} numberOfLines={1}>
                {label}
              </Text>
            </PressableScale>
          )
        })}
        <PressableScale
          onPress={onNew}
          disabled={!active || active.lines.length === 0}
          accessibilityLabel="Park this sale and start a new one"
          style={[styles.tab, styles.tabNew, (!active || active.lines.length === 0) && styles.tabNewOff]}
          hitSlop={4}
        >
          <Text style={styles.tabNewText}>+ New</Text>
        </PressableScale>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.ink,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    gap: space.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { ...type.titleSm, color: colors.surface, flex: 1 },
  textButton: {
    height: 40,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
  },
  textButtonOn: { backgroundColor: colors.brand },
  textButtonLabel: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
  textButtonLabelOn: { color: colors.ink },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonOn: { backgroundColor: colors.brand },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: space.md,
  },
  searchInput: { ...type.body, flex: 1, color: colors.surface, paddingVertical: 0 },
  tabs: { gap: space.sm, alignItems: 'center' },
  tab: { height: 34, paddingHorizontal: space.md, borderRadius: radius.pill, justifyContent: 'center' },
  tabOn: { backgroundColor: colors.brand },
  tabParked: { backgroundColor: 'rgba(255,255,255,0.12)' },
  tabText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface, ...tabular },
  tabTextOn: { color: colors.ink },
  tabNew: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)' },
  tabNewOff: { opacity: 0.4 },
  tabNewText: { fontFamily: fonts.bold, fontSize: 13, color: colors.surface },
})
