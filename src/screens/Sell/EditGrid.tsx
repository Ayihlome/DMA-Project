import React, { useState, type ReactNode } from 'react'
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native'
import Animated, { FadeIn, FadeOut, LinearTransition, useAnimatedRef } from 'react-native-reanimated'
import Sortable from 'react-native-sortables'
import MaterialIcon from '../../components/common/MaterialIcon'
import PressableScale from '../../components/ui/PressableScale'
import { colors, DURATION, fonts, radius, space, type } from '../../theme/tokens'
import { TILE_HEIGHT } from './SellTile'
import { tileName, type Tile } from './sellModel'

const GAP = 8
const SIDE = 16

// Module scope: layout-animation builders shouldn't be rebuilt every render
const ENTER = FadeIn.duration(200)
const EXIT = FadeOut.duration(160)
const REFLOW = LinearTransition.duration(200)

/**
 * The grid in edit mode: every tile gets a dashed border, a × to hide it and
 * ◀ ▶ to nudge it one place. Hold and drag to move it anywhere.
 *
 * Dragging is react-native-sortables: the drag, the springs and the other tiles
 * making room all run on the UI thread, and it ticks (expo-haptics) when a tile
 * is dropped. The × and arrows are Sortable.Touchable, so tapping them never
 * starts a drag.
 */
export function EditGrid({
  tiles,
  bottomPadding,
  onReorder,
  onHide,
  onMove,
}: {
  tiles: Tile[]
  bottomPadding: number
  onReorder: (ids: string[]) => void
  onHide: (id: string) => void
  onMove: (id: string, by: -1 | 1) => void
}) {
  const scroller = useAnimatedRef<Animated.ScrollView>()

  return (
    <Animated.View entering={ENTER} exiting={EXIT} style={styles.flex}>
      <Animated.ScrollView
        ref={scroller}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <Sortable.Grid
          data={tiles}
          columns={3}
          rowGap={GAP}
          columnGap={GAP}
          keyExtractor={(t) => t.id}
          // Lets a drag near the top or bottom edge scroll the list
          scrollableRef={scroller}
          hapticsEnabled
          activeItemScale={1.05}
          inactiveItemOpacity={0.85}
          onDragEnd={({ data }) => onReorder(data.map((t) => t.id))}
          renderItem={({ item, index }) => (
            <EditTile
              tile={item}
              first={index === 0}
              last={index === tiles.length - 1}
              onHide={() => onHide(item.id)}
              onMove={(by) => onMove(item.id, by)}
            />
          )}
        />
      </Animated.ScrollView>
    </Animated.View>
  )
}

function EditTile({
  tile,
  first,
  last,
  onHide,
  onMove,
}: {
  tile: Tile
  first: boolean
  last: boolean
  onHide: () => void
  onMove: (by: -1 | 1) => void
}) {
  const name = tileName(tile)
  return (
    <View style={styles.tile} accessibilityLabel={`${name}. Hold and drag to move.`}>
      <Text style={styles.title} numberOfLines={2}>
        {name}
      </Text>

      <TileButton onTap={onHide} style={styles.hide} containerStyle={styles.hideSpot} label={`Hide ${name}`}>
        <MaterialIcon name="close" size={14} color={colors.surface} />
      </TileButton>

      <View style={styles.arrows}>
        <TileButton
          onTap={first ? undefined : () => onMove(-1)}
          style={[styles.arrow, first && styles.arrowOff]}
          containerStyle={styles.arrowSpot}
          label={`Move ${name} earlier`}
          disabled={first}
        >
          <MaterialIcon name="chevron_left" size={16} color={colors.ink} />
        </TileButton>
        <TileButton
          onTap={last ? undefined : () => onMove(1)}
          style={[styles.arrow, last && styles.arrowOff]}
          containerStyle={styles.arrowSpot}
          label={`Move ${name} later`}
          disabled={last}
        >
          <MaterialIcon name="chevron_right" size={16} color={colors.ink} />
        </TileButton>
      </View>
    </View>
  )
}

/**
 * A button inside a sortable tile. Sortable.Touchable takes the tap without
 * starting a drag, but has no pressed state of its own — so press-in and
 * press-out drive a small scale here. A tap on a 24px target that doesn't move
 * feels like it was missed.
 */
function TileButton({
  onTap,
  style,
  containerStyle,
  label,
  disabled,
  children,
}: {
  onTap?: () => void
  style: StyleProp<ViewStyle>
  /** Where the button sits (e.g. pinned to a corner) — on the touch target, not the scaling view. */
  containerStyle?: StyleProp<ViewStyle>
  label: string
  disabled?: boolean
  children: ReactNode
}) {
  const [down, setDown] = useState(false)
  return (
    <Sortable.Touchable
      onTap={onTap}
      onTouchesDown={() => !disabled && setDown(true)}
      onTouchesUp={() => setDown(false)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={containerStyle}
    >
      <Animated.View style={[style, styles.press, down && styles.pressed]}>{children}</Animated.View>
    </Sortable.Touchable>
  )
}

/**
 * Replaces the sale panel while editing: hidden tiles as "+ Name" chips to
 * bring back, the menu entry point, and Done. The sale in progress is
 * untouched underneath and comes back on Done.
 */
export function EditPanel({
  hidden,
  bottomSpace,
  onRestore,
  onNewMenuItem,
  onDone,
  onLayout,
}: {
  hidden: Tile[]
  bottomSpace: number
  onRestore: (id: string) => void
  onNewMenuItem: () => void
  onDone: () => void
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  return (
    <Animated.View
      entering={ENTER}
      exiting={EXIT}
      style={[styles.panel, { paddingBottom: bottomSpace }]}
      onLayout={onLayout}
    >
      <Text style={styles.panelTitle}>Hidden tiles</Text>
      {hidden.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {hidden.map((t) => (
            <Animated.View key={t.id} entering={ENTER} exiting={EXIT} layout={REFLOW}>
              <PressableScale
                onPress={() => onRestore(t.id)}
                accessibilityLabel={`Show ${tileName(t)} again`}
                style={styles.chip}
                hitSlop={4}
              >
                <Text style={styles.chipText}>{`+ ${tileName(t)}`}</Text>
              </PressableScale>
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.empty}>Nothing hidden. Tap × on a tile to hide it.</Text>
      )}

      <View style={styles.buttons}>
        <PressableScale onPress={onNewMenuItem} accessibilityLabel="Add a new menu item" style={styles.secondary}>
          <Text style={styles.secondaryText}>+ New menu item</Text>
        </PressableScale>
        <PressableScale onPress={onDone} accessibilityLabel="Done editing" containerStyle={styles.flex} style={styles.done}>
          <Text style={styles.doneText}>Done</Text>
        </PressableScale>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: SIDE, paddingTop: space.xs },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9C9C94',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 6,
    justifyContent: 'space-between',
  },
  title: { fontFamily: fonts.bold, fontSize: 14, lineHeight: 18, color: colors.ink, paddingRight: 24 },
  // 24px visual, 44px touch: the padding is the extra target, pulled back out
  // with the offset so the × still sits 6px from the corner
  hideSpot: { position: 'absolute', top: -4, right: -4, padding: 10 },
  hide: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Same trick for ◀ ▶: 32×26 visuals inside 44×44 touch areas
  arrows: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: -6, marginBottom: -9 },
  arrowSpot: { padding: 6, paddingVertical: 9 },
  arrow: {
    width: 32,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowOff: { opacity: 0.3 },
  press: {
    transform: [{ scale: 1 }],
    transitionProperty: 'transform',
    transitionDuration: `${DURATION.press}ms`,
    transitionTimingFunction: 'ease-out',
  },
  pressed: { transform: [{ scale: 0.9 }] },

  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: space.lg,
    paddingHorizontal: space.lg,
    gap: space.md,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  panelTitle: { ...type.bodyStrong, color: colors.ink },
  chips: { gap: space.sm },
  chip: {
    height: 38,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#9C9C94',
    justifyContent: 'center',
  },
  chipText: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  empty: { ...type.caption, color: colors.muted },
  buttons: { flexDirection: 'row', gap: space.sm },
  secondary: {
    height: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.field,
    justifyContent: 'center',
  },
  secondaryText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  done: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { ...type.button, color: colors.brand },
})
