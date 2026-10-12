import React, { type ReactNode } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTabBarSpace } from '../nav/TabBar'
import { colors, radius } from '../../theme/tokens'

/**
 * The yellow-header layout for main screens (Home, Profile): the same split
 * background and two 56px curves as the auth screens, with a header you fill.
 *
 *   - background: left half white, right half yellow
 *   - yellow header, rounded bottom-left — shows the white half beneath
 *   - white panel, rounded top-right — shows the yellow half beneath
 *
 * Deliberately its own component, not a refactor of AuthShell: the auth
 * screens are signed off, and sharing code with them would mean any change
 * here could move them.
 */
export default function YellowHeaderScreen({
  headerHeight,
  header,
  children,
}: {
  /** Height below the status bar. */
  headerHeight: number
  header: ReactNode
  children: ReactNode
}) {
  const insets = useSafeAreaInsets()
  const tabSpace = useTabBarSpace()

  return (
    <View style={styles.root}>
      <View style={styles.split} pointerEvents="none">
        <View style={styles.white} />
        <View style={styles.yellow} />
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        // The header runs under the status bar
        contentInsetAdjustmentBehavior="never"
      >
        <View style={[styles.header, { height: headerHeight + insets.top, paddingTop: insets.top }]}>{header}</View>
        {/* Clears the floating tab bar, which React Navigation doesn't pad for */}
        <View style={[styles.panel, { paddingBottom: tabSpace }]}>{children}</View>
      </ScrollView>
    </View>
  )
}

/** Spec: side padding 28 on these screens. */
export const SIDE = 28

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1 },
  split: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  white: { flex: 1, backgroundColor: colors.surface },
  yellow: { flex: 1, backgroundColor: colors.brand },
  scroll: { flexGrow: 1 },
  header: {
    backgroundColor: colors.brand,
    borderBottomLeftRadius: radius.panel,
    paddingHorizontal: SIDE,
  },
  panel: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderTopRightRadius: radius.panel,
    paddingTop: 36,
    paddingHorizontal: SIDE,
  },
})
