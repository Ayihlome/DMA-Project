import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown } from 'react-native-reanimated'
import * as Haptics from 'expo-haptics'
import { router, useLocalSearchParams } from 'expo-router'
import { useTabBarSpace } from '../../components/nav/TabBar'
import ActionToast, { type Toast } from '../../components/ui/ActionToast'
import { useStore } from '../../store'
import { DEFAULT_SELL_GRID } from '../../data/actions'
import { QUICK_AMOUNT_ID, type PaymentMethod, type Product } from '../../data/types'
import { colors, fonts, money, radius, space, type } from '../../theme/tokens'
import { EditGrid, EditPanel } from './EditGrid'
import GroupSheet from './GroupSheet'
import KeypadSheet from './KeypadSheet'
import MenuItemSheet, { type MenuEdit } from './MenuItemSheet'
import MultiplierRow from './MultiplierRow'
import PaySheet from './PaySheet'
import SalePanel from './SalePanel'
import SellHeader from './SellHeader'
import SellTile, { HOLD_MS } from './SellTile'
import {
  buildTiles,
  draftToSale,
  draftTotal,
  itemQty,
  lastUsedItem,
  menuTileId,
  orderTiles,
  receiptText,
  repriceDraft,
  shortName,
  tileIdFor,
  tileName,
  tileEmoji,
  tileQty,
  tileSales,
  type AddItem,
  type GroupTile,
  type Tile,
} from './sellModel'
import { useDrafts } from './useDrafts'

const COLUMNS = 3
const GAP = 8
const SIDE = 16

const TOAST_ENTER = FadeInDown.duration(200)
const TOAST_EXIT = FadeOutDown.duration(160)
const TIP_IN = FadeIn.duration(200)
const TIP_OUT = FadeOut.duration(160)

/** Set once the owner has seen the press-and-hold tip, per phone. */
const TIP_KEY = 'stockevo-tip-hold'

/** Phones always have a share sheet; a browser only sometimes does. */
const canShare = () =>
  Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function')

/**
 * Quick sell — the most important screen. Speed first: most sales are taps,
 * not searches.
 *
 * Nothing here ever refuses a sale for stock. The store lets stock go negative
 * and Count stock flags it later; the counter's job is to take money.
 *
 * The menu (kotas, burgers, whatever the shop makes) can be edited from here
 * mid-sale. Sheets open one at a time — iOS won't reliably stack two modals —
 * so the picker closes, the editor opens, and the picker comes back after.
 */
export default function QuickSellScreen() {
  const store = useStore()
  const drafts = useDrafts()
  const tabSpace = useTabBarSpace()

  const [multiplier, setMultiplier] = useState(1)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [groupTile, setGroupTile] = useState<GroupTile | null>(null)
  const [keypadOpen, setKeypadOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [menuEdit, setMenuEdit] = useState<MenuEdit | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const clearToast = useCallback(() => setToast(null), [])
  // Shown once per phone, until the owner taps "Got it" or holds a tile
  const [showTip, setShowTip] = useState(false)
  const [panelHeight, setPanelHeight] = useState(200)
  const [gridWidth, setGridWidth] = useState(0)

  // Profile → "Edit sell grid" arrives as /sales?edit=1: open in edit mode, then
  // drop the param so coming back to the tab later doesn't re-open it
  // Reacting to the param during render (React's "adjust state when a prop
  // changes" pattern), not in an effect: an effect would render once without
  // edit mode first, then again with it.
  const { edit } = useLocalSearchParams<{ edit?: string }>()
  // Starts at undefined, not `edit`: if Sell's very first render already has
  // edit=1 (the tab wasn't open yet), that still has to count as a change
  const [seenEdit, setSeenEdit] = useState<string | undefined>(undefined)
  if (edit !== seenEdit) {
    setSeenEdit(edit)
    if (edit === '1') {
      setSearching(false)
      setQuery('')
      setEditing(true)
    }
  }
  // Clearing the URL is the outside-world part, so that one is an effect
  useEffect(() => {
    if (edit === '1') router.setParams({ edit: undefined })
  }, [edit])

  // Sheet hand-offs: what to open once the current sheet has finished leaving
  const pendingEdit = useRef<MenuEdit | null>(null)
  const reopenGroup = useRef<string | null>(null)
  // A sheet's close callback is captured when the close starts, before a save
  // has re-rendered — so the hand-off reads products from here, not a closure
  const latestProducts = useRef(store.state.products)
  useEffect(() => {
    latestProducts.current = store.state.products
  }, [store.state.products])

  // Press-and-hold repeat
  const [holding, setHolding] = useState<{ item: AddItem; product?: Product } | null>(null)
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const grid = useMemo(() => ({ ...DEFAULT_SELL_GRID, ...store.state.sellGrid }), [store.state.sellGrid])
  const products = useMemo(() => new Map(store.state.products.map((p) => [p.id, p])), [store.state.products])

  const allTiles = useMemo(() => buildTiles(store.state.products), [store.state.products])
  /** Visible tiles in grid order — what edit mode arranges. */
  const ordered = useMemo(
    () => orderTiles(allTiles, grid, tileSales(store.state.sales, store.state.products)),
    [allTiles, grid, store.state.sales, store.state.products],
  )
  const hiddenTiles = useMemo(() => allTiles.filter((t) => grid.hidden.includes(t.id)), [allTiles, grid.hidden])

  const tiles = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ordered
    // A group tile matches on what's inside it too: "sasko" finds Bread
    return ordered.filter((t) => {
      if (tileName(t).toLowerCase().includes(q)) return true
      return t.kind === 'group' && t.members.some((m) => `${m.name} ${m.variant ?? ''}`.toLowerCase().includes(q))
    })
  }, [ordered, query])

  // Floored: three fractional widths plus two gaps can round past the row and
  // wrap the third tile onto its own line
  const cell = gridWidth ? Math.floor((gridWidth - GAP * (COLUMNS - 1)) / COLUMNS) : 0

  useEffect(() => {
    let alive = true
    AsyncStorage.getItem(TIP_KEY)
      .then((seen) => alive && !seen && setShowTip(true))
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const dismissTip = useCallback(() => {
    setShowTip(false)
    AsyncStorage.setItem(TIP_KEY, '1').catch(() => {})
  }, [])

  // Never leave a repeat running if the screen goes away mid-hold
  useEffect(
    () => () => {
      if (holdTimer.current) clearInterval(holdTimer.current)
    },
    [],
  )

  /** Remembers what was picked from a group tile, so it comes first next time. Skips no-op writes. */
  const rememberPick = useCallback(
    (item: AddItem, p: Product | undefined) => {
      if (!p || (!p.family && !p.menu)) return
      const tileId = tileIdFor(p)
      const sameProduct = grid.lastUsed[tileId] === p.id
      const sameAmount = !item.counterPriced || grid.lastAmount?.[p.id] === item.price
      if (sameProduct && sameAmount) return
      store.updateSellGrid({
        lastUsed: { ...grid.lastUsed, [tileId]: p.id },
        ...(item.counterPriced ? { lastAmount: { ...grid.lastAmount, [p.id]: item.price } } : {}),
      })
    },
    [grid.lastUsed, grid.lastAmount, store],
  )

  /** Adds to the open sale, with a tick you can feel without looking at the screen. */
  const add = useCallback(
    (item: AddItem, qty: number, p?: Product) => {
      drafts.add(item, qty)
      Haptics.selectionAsync()
      rememberPick(item, p)
    },
    [drafts, rememberPick],
  )

  const addWithMultiplier = (item: AddItem, p?: Product) => {
    add(item, multiplier, p)
    // Back to ×1 after one add, so a leftover ×10 can't multiply the next item
    setMultiplier(1)
  }

  const onTap = (t: Tile) => {
    if (t.kind === 'single') addWithMultiplier({ productId: t.product.id, price: t.product.price }, t.product)
    else if (t.kind === 'group') setGroupTile(t)
    else setKeypadOpen(true)
  }

  /** What holding a tile repeats, or null if it hasn't been sold from yet (then the picker opens). */
  const holdTarget = (t: Tile): { item: AddItem; product?: Product } | null => {
    if (t.kind === 'single') return { item: { productId: t.product.id, price: t.product.price }, product: t.product }
    if (t.kind === 'group') {
      const item = lastUsedItem(t, grid)
      return item ? { item, product: products.get(item.productId) } : null
    }
    // Quick amount repeats the last amount typed into this sale
    const last = [...(drafts.active?.lines ?? [])].reverse().find((l) => l.productId === QUICK_AMOUNT_ID)
    return last ? { item: { productId: last.productId, price: last.price, label: last.label, counterPriced: true } } : null
  }

  const onHoldStart = (t: Tile) => {
    const target = holdTarget(t)
    if (!target) {
      onTap(t) // nothing to repeat yet: open the picker or keypad instead
      return
    }
    add(target.item, 1, target.product)
    setHolding(target)
    if (showTip) dismissTip() // they've found it
    if (holdTimer.current) clearInterval(holdTimer.current)
    holdTimer.current = setInterval(() => add(target.item, 1, target.product), HOLD_MS)
  }

  const onHoldEnd = () => {
    if (holdTimer.current) clearInterval(holdTimer.current)
    holdTimer.current = null
    setHolding(null)
    setMultiplier(1)
  }

  // Everything on screen reads the repriced sale, so what's shown is what's charged
  const active = drafts.active ? repriceDraft(drafts.active, products) : null
  const shownDrafts = useMemo(() => drafts.drafts.map((d) => repriceDraft(d, products)), [drafts.drafts, products])

  /** Done on the pay sheet: save the sale (on the phone first; the backup syncs it), clear the tab. */
  const completeSale = (payment: PaymentMethod, cashGiven?: number) => {
    if (!active?.lines.length) return
    const total = draftTotal(active)
    const result = store.recordSale(draftToSale(active), { payment, cashGiven })
    if (!result.ok) {
      setToast({ message: result.message })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }
    // Built before the tab is cleared: the receipt is this sale's lines
    const receipt = receiptText({
      shop: store.state.profile.storeName,
      lines: active.lines,
      products,
      total,
      payment,
      cashGiven,
    })
    drafts.finishActive()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const change = payment === 'Cash' && cashGiven != null ? Math.round((cashGiven - total) * 100) / 100 : 0
    setToast({
      message: `Sale saved · ${money(total)} · ${payment}${change > 0 ? ` · change ${money(change)}` : ''}`,
      // The phone's share sheet: WhatsApp, SMS, whatever the customer uses
      action: canShare() ? { label: 'Share', onPress: () => void Share.share({ message: receipt }).catch(() => {}) } : undefined,
    })
  }

  // --- Edit grid -------------------------------------------------------------
  // Order is only written when the owner actually moves something, so until
  // then the grid keeps following best sellers. Hiding doesn't freeze it.

  const toggleEditing = () => {
    Haptics.selectionAsync()
    setSearching(false)
    setQuery('')
    setEditing((e) => !e)
  }

  const moveTile = (id: string, by: -1 | 1) => {
    const ids = ordered.map((t) => t.id)
    const i = ids.indexOf(id)
    const j = i + by
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    Haptics.selectionAsync()
    store.updateSellGrid({ order: ids })
  }

  const subtitleFor = (t: Tile) => {
    if (t.kind === 'single') return money(t.product.price)
    if (t.kind === 'quick') return 'Type a price'
    const last = lastUsedItem(t, grid)
    const p = last ? products.get(last.productId) : undefined
    if (!p || !last) return t.menu ? `${t.members.length} item${t.members.length === 1 ? '' : 's'}` : 'Tap to choose'
    const name = t.menu ? p.name : p.family === 'bread' ? (p.variant ?? p.name) : shortName(p, last.price)
    return `Last: ${name}`
  }

  /** The group tile for a menu name, from the latest products (it may have just been created). */
  const findMenuTile = (group: string) =>
    buildTiles(latestProducts.current).find((t): t is GroupTile => t.id === menuTileId(group)) ?? null

  /** Opens the editor if a sheet that just closed asked for it. */
  const openPendingEdit = () => {
    if (!pendingEdit.current) return
    setMenuEdit(pendingEdit.current)
    pendingEdit.current = null
  }

  if (!drafts.ready || !active) return <View style={styles.screen} />

  const holdingQty = holding ? itemQty(active, holding.item) : 0

  return (
    <View style={styles.screen}>
      <SellHeader
        drafts={shownDrafts}
        activeId={active.id}
        onSwitch={drafts.switchTo}
        onNew={drafts.park}
        onEditGrid={toggleEditing}
        editing={editing}
        searching={searching}
        query={query}
        onToggleSearch={() => {
          setSearching((s) => !s)
          setQuery('')
        }}
        onQuery={setQuery}
      />

      {showTip && !editing ? (
        <Animated.View entering={TIP_IN} exiting={TIP_OUT} style={styles.tip}>
          <Text style={styles.tipText}>
            <Text style={styles.tipStrong}>Tip: </Text>
            hold a tile to keep adding it. Let go to stop.
          </Text>
          <Pressable onPress={dismissTip} accessibilityRole="button" accessibilityLabel="Got it" hitSlop={10}>
            <Text style={styles.tipAction}>Got it</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      <View style={styles.multiplier}>
        {editing ? (
          <Text style={styles.editHint}>Hold and drag to move · ◀ ▶ to nudge · × to hide</Text>
        ) : (
          <MultiplierRow value={multiplier} onChange={setMultiplier} />
        )}
      </View>

      {editing ? (
        <EditGrid
          tiles={ordered}
          bottomPadding={panelHeight + space.lg}
          onReorder={(ids) => store.updateSellGrid({ order: ids })}
          onHide={(id) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            store.updateSellGrid({ hidden: [...grid.hidden, id] })
          }}
          onMove={moveTile}
        />
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: panelHeight + space.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.grid} onLayout={(e: LayoutChangeEvent) => setGridWidth(e.nativeEvent.layout.width)}>
          {cell > 0 &&
            tiles.map((t) => (
              <View key={t.id} style={{ width: cell }}>
                <SellTile
                  tile={t}
                  emoji={tileEmoji(t)}
                  title={tileName(t)}
                  subtitle={subtitleFor(t)}
                  qty={tileQty(t, active, store.state.products)}
                  onTap={() => onTap(t)}
                  onHoldStart={() => onHoldStart(t)}
                  onHoldEnd={onHoldEnd}
                />
              </View>
            ))}
        </View>
        {query.trim() && tiles.length === 0 ? (
          <Text style={styles.noResults}>{`Nothing matches "${query.trim()}".`}</Text>
        ) : null}
      </ScrollView>
      )}

      {editing ? (
        <EditPanel
          hidden={hiddenTiles}
          bottomSpace={tabSpace - space.lg}
          onRestore={(id) => {
            Haptics.selectionAsync()
            store.updateSellGrid({ hidden: grid.hidden.filter((h) => h !== id) })
          }}
          onNewMenuItem={() => setMenuEdit({ group: '' })}
          onDone={toggleEditing}
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
        />
      ) : (
        <SalePanel
          draft={active}
          products={products}
          bottomSpace={tabSpace - space.lg}
          onUndo={() => {
            drafts.undo()
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }}
          onPark={drafts.park}
          onCharge={() => setPayOpen(true)}
          onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}
        />
      )}

      {holding ? (
        <Animated.View
          key="hold"
          entering={TOAST_ENTER}
          exiting={TOAST_EXIT}
          style={[styles.toast, { bottom: panelHeight + space.sm }]}
          accessibilityLiveRegion="polite"
          pointerEvents="none"
        >
          <Text style={styles.toastText} numberOfLines={2}>
            {`Adding ${shortName(holding.product, holding.item.price, holding.item.label)} · ${holdingQty} in sale · let go to stop`}
          </Text>
        </Animated.View>
      ) : null}
      <ActionToast toast={holding ? null : toast} bottom={panelHeight + space.sm} onDone={clearToast} />

      <GroupSheet
        tile={groupTile}
        grid={grid}
        multiplier={multiplier}
        onPick={(item, p) => addWithMultiplier(item, p)}
        onEditMenu={(product) => {
          if (!groupTile) return
          pendingEdit.current = { group: groupTile.menu ?? groupTile.label, product: product ?? undefined }
        }}
        onClose={() => {
          setGroupTile(null)
          // An edit was asked for: open the editor now that the picker has gone
          openPendingEdit()
        }}
      />

      <MenuItemSheet
        edit={menuEdit}
        onSaved={(product, group) => {
          reopenGroup.current = group
          setToast({ message: product ? `${product.name} saved to ${group}` : `Removed from ${group}` })
        }}
        onClose={() => {
          setMenuEdit(null)
          // Back to the picker, so the owner sees the change and can sell it
          const group = reopenGroup.current
          reopenGroup.current = null
          // Not while arranging the grid: the new tile showing up is the feedback there
          const tile = group && !editing ? findMenuTile(group) : null
          if (tile) setGroupTile(tile)
        }}
      />

      <KeypadSheet
        visible={keypadOpen}
        multiplier={multiplier}
        onAdd={(amount) =>
          addWithMultiplier({ productId: QUICK_AMOUNT_ID, price: amount, label: 'Other', counterPriced: true })
        }
        onClose={() => setKeypadOpen(false)}
      />

      <PaySheet
        visible={payOpen}
        total={draftTotal(active)}
        onDone={completeSale}
        onClose={() => setPayOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.page },
  multiplier: { paddingHorizontal: SIDE, paddingTop: space.md, paddingBottom: space.sm },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  noResults: { ...type.body, color: colors.muted, textAlign: 'center', paddingTop: space.xl },
  toast: {
    position: 'absolute',
    left: SIDE,
    right: SIDE,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  toastText: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 19, color: colors.surface },
  editHint: { ...type.caption, color: colors.muted, paddingVertical: space.sm },
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: SIDE,
    marginTop: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
  },
  tipText: { ...type.caption, color: colors.ink, flex: 1 },
  tipStrong: { fontFamily: fonts.bold },
  tipAction: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink, textDecorationLine: 'underline' },
})
