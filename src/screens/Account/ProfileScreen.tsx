import React, { useMemo, useState } from 'react'
import { Alert, Platform, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import YellowHeaderScreen from '../../components/layout/YellowHeaderScreen'
import BottomSheet from '../../components/ui/BottomSheet'
import FilledInput from '../../components/ui/FilledInput'
import ListRow from '../../components/ui/ListRow'
import PressableScale from '../../components/ui/PressableScale'
import PrimaryButton from '../../components/ui/PrimaryButton'
import Skeleton from '../../components/ui/Skeleton'
import { useStore } from '../../store'
import { useAuth, type AuthState } from '../../providers/AuthProvider'
import { supabase } from '../../lib/supabase'
import { actions, relativeTime } from '../../core'
import { pricesFor } from '../../data/inventory'
import * as Haptics from 'expo-haptics'
import { DAY_NAMES, restockDayName, restockDayOf } from '../Restock/restockModel'
import { QUEUE_KEY } from '../../lib/telemetry'
import { colors, fonts, radius, space, type } from '../../theme/tokens'

/** Spec: same yellow-header pattern as Home. */
const HEADER = 250

const CONFIRM_IN = FadeIn.duration(200)
const CONFIRM_OUT = FadeOut.duration(160)

/** Alert's buttons do nothing on web, so messages fall back to window.alert. */
function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`)
  else Alert.alert(title, message)
}

async function signOutOrExplain(signOut: AuthState['signOut']) {
  const { error } = await signOut()
  // Sign-out needs the internet to end the session on the server
  if (error) notify('Sign out failed', `Couldn't sign out: ${error.message}. Check your connection and try again.`)
}

function confirmSignOut(signOut: AuthState['signOut']) {
  if (Platform.OS === 'web') {
    if (window.confirm('Sign out of StockEvo?')) void signOutOrExplain(signOut)
    return
  }
  Alert.alert('Sign out', 'Sign out of StockEvo?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Sign out', style: 'destructive', onPress: () => void signOutOrExplain(signOut) },
  ])
}

/**
 * Profile: who you are, the shop's settings as plain rows, sign out, and
 * account deletion behind an inline confirm.
 *
 * The backup line under the shop name only says "Backed up" once an upload has
 * actually succeeded — it never claims a sync that didn't happen.
 */
export default function ProfileScreen() {
  const store = useStore()
  const { signOut } = useAuth()
  const { state } = store

  const [editOpen, setEditOpen] = useState(false)
  const [suppliersOpen, setSuppliersOpen] = useState(false)
  const [dayOpen, setDayOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const initial = (state.profile.ownerName.trim()[0] ?? '?').toUpperCase()
  const backedUp = store.backupStatus === 'backed-up'

  const backupLine = backedUp
    ? `Backed up ${relativeTime(state.lastSyncedAt)}`
    : !store.online
      ? 'Offline · saved on this phone'
      : store.backupStatus === 'pushing'
        ? 'Backing up…'
        : store.backupStatus === 'error'
          ? 'Backup failed · tap to try again'
          : 'Saved on this phone · tap to back up'
  const canBackUp = !backedUp && store.online && store.backupStatus !== 'pushing'

  async function exportReport() {
    setExporting(true)
    try {
      const { shareInventoryReport } = await import('../../lib/report')
      const { analyticsOf } = await import('../../core')
      await shareInventoryReport({
        ...analyticsOf(state),
        store: state.profile.storeName,
        owner: state.profile.ownerName,
      })
    } catch {
      notify('Export failed', "The report couldn't be created on this device.")
    } finally {
      setExporting(false)
    }
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      // Runs as a security definer function that targets auth.uid() only, so no
      // service role key is ever needed in the app.
      const { error } = await supabase.rpc('delete_own_account')
      if (error) {
        notify('Could not delete the account', `${error.message}. Check your connection and try again.`)
        return
      }
      // The shop_backups row goes with the auth.users row via on delete cascade
      await AsyncStorage.multiRemove([actions.STATE_KEY, actions.PHOTO_KEY, actions.OWNER_KEY, QUEUE_KEY]).catch(() => {})
      // The session is already invalid server-side; this clears the local token.
      await signOut().catch(() => {})
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <YellowHeaderScreen
        headerHeight={HEADER}
        header={
          <View style={styles.header}>
            <View style={styles.avatar} accessibilityElementsHidden>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <Text style={styles.name} accessibilityRole="header" numberOfLines={1}>
              {state.profile.ownerName}
            </Text>
            <Text style={styles.shop} numberOfLines={1}>
              {state.profile.storeName}
            </Text>
            <PressableScale
              onPress={store.backUpNow}
              disabled={!canBackUp}
              accessibilityLabel={backupLine}
              style={styles.backup}
              hitSlop={8}
            >
              <View style={[styles.backupDot, backedUp && styles.backupDotOn]} />
              <Text style={styles.backupText}>{backupLine}</Text>
            </PressableScale>
          </View>
        }
      >
        <View>
          <ListRow title="Edit profile" detail="Your name and shop name" onPress={() => setEditOpen(true)} />
          <ListRow title="What you sell" detail="Products and their selling prices" onPress={() => router.push('/products')} />
          <ListRow title="Menu" detail="Food you make and its ingredients" onPress={() => router.push('/menu')} />
          <ListRow title="Edit sell grid" detail="Move and hide tiles on Sell" onPress={() => router.navigate('/sales?edit=1')} />
          <ListRow
            title="Shopping day"
            detail={`${restockDayName(state)} · Restock plans for this day`}
            onPress={() => setDayOpen(true)}
          />
          <ListRow
            title="Suppliers"
            detail={`${state.suppliers.length} saved`}
            onPress={() => setSuppliersOpen(true)}
          />
          {/* expo-print and expo-sharing have no web implementation */}
          {Platform.OS !== 'web' ? (
            <ListRow
              title="Export a report"
              detail={exporting ? 'Preparing your report…' : 'Stock and sales as a PDF'}
              onPress={exporting ? undefined : exportReport}
              trailing={exporting ? <Skeleton width={28} height={10} radius={5} /> : undefined}
            />
          ) : null}
          <ListRow title="Privacy notice" onPress={() => router.push('/privacy')} last />
        </View>

        <PressableScale
          onPress={() => confirmSignOut(signOut)}
          accessibilityLabel="Sign out"
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </PressableScale>

        {confirmDelete ? (
          <Animated.View entering={CONFIRM_IN} exiting={CONFIRM_OUT} style={styles.confirm}>
            <Text style={styles.confirmTitle}>Delete your account?</Text>
            <Text style={styles.confirmText}>
              {"Every product, sale and supplier price goes with it, on this phone and in the cloud. This can't be undone."}
            </Text>
            <View style={styles.confirmRow}>
              <PressableScale
                onPress={() => setConfirmDelete(false)}
                disabled={deleting}
                accessibilityLabel="Keep my account"
                containerStyle={styles.flex}
                style={styles.keep}
              >
                <Text style={styles.keepText}>Keep it</Text>
              </PressableScale>
              <PressableScale
                onPress={() => void deleteAccount()}
                disabled={deleting}
                accessibilityLabel="Delete my account"
                accessibilityState={{ disabled: deleting }}
                containerStyle={styles.flex}
                style={styles.delete}
              >
                {deleting ? (
                  <Skeleton width="40%" height={12} radius={6} tone="dark" />
                ) : (
                  <Text style={styles.deleteText}>Delete</Text>
                )}
              </PressableScale>
            </View>
          </Animated.View>
        ) : (
          <PressableScale
            onPress={() => setConfirmDelete(true)}
            accessibilityLabel="Delete account"
            style={styles.deleteLink}
          >
            <Text style={styles.deleteLinkText}>Delete account</Text>
          </PressableScale>
        )}
      </YellowHeaderScreen>

      <EditProfileSheet visible={editOpen} onClose={() => setEditOpen(false)} />
      <SuppliersSheet visible={suppliersOpen} onClose={() => setSuppliersOpen(false)} />
      <ShoppingDaySheet visible={dayOpen} onClose={() => setDayOpen(false)} />
    </>
  )
}

function EditProfileSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore()
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Edit profile" handleOnly>
      {(finish) => (
        <EditProfileForm
          onSave={(p) => {
            store.updateProfile(p)
            finish()
          }}
        />
      )}
    </BottomSheet>
  )
}

function EditProfileForm({ onSave }: { onSave: (p: { ownerName: string; storeName: string }) => void }) {
  const { state } = useStore()
  const [ownerName, setOwnerName] = useState(state.profile.ownerName)
  const [storeName, setStoreName] = useState(state.profile.storeName)
  const canSave = ownerName.trim().length > 0 && storeName.trim().length > 0

  return (
    <View style={styles.form}>
      <FilledInput label="Your name" value={ownerName} onChangeText={setOwnerName} autoCapitalize="words" autoComplete="name" />
      <FilledInput label="Shop name" value={storeName} onChangeText={setStoreName} autoCapitalize="words" />
      <PrimaryButton
        label="Save"
        disabled={!canSave}
        onPress={() => onSave({ ownerName: ownerName.trim(), storeName: storeName.trim() })}
      />
    </View>
  )
}

/** Monday first — how a shop week reads — though the app counts from Sunday. */
const WEEK = [1, 2, 3, 4, 5, 6, 0]

/** Which day the owner goes shopping. Restock plans each list to last until the next one. */
function ShoppingDaySheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const store = useStore()
  const current = restockDayOf(store.state)
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Shopping day">
      {(finish) => (
        <View style={styles.form}>
          <Text style={styles.sheetLead}>Which day do you usually buy stock? Restock makes your list for that day.</Text>
          <View style={styles.days}>
            {WEEK.map((d) => {
              const on = d === current
              return (
                <View key={d} style={styles.dayCell}>
                  <PressableScale
                    onPress={() => {
                      Haptics.selectionAsync()
                      store.setRestockDay(d)
                      finish()
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={DAY_NAMES[d]}
                    style={[styles.day, on && styles.dayOn]}
                  >
                    <Text style={styles.dayText}>{DAY_NAMES[d]}</Text>
                  </PressableScale>
                </View>
              )
            })}
          </View>
        </View>
      )}
    </BottomSheet>
  )
}

/**
 * Who the shop buys from, and how many items each one is cheapest for. Read
 * only for now — suppliers are added by typing a new name when adding a price.
 */
function SuppliersSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { state } = useStore()
  const rows = useMemo(() => {
    const cheapestFor = new Map<string, number>()
    for (const p of state.products) {
      const best = pricesFor(state, p.id)[0]
      if (best) cheapestFor.set(best.supplierId, (cheapestFor.get(best.supplierId) ?? 0) + 1)
    }
    return [...state.suppliers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => {
        const n = cheapestFor.get(s.id) ?? 0
        const where = [s.location, s.contact].filter(Boolean).join(' · ')
        return { s, detail: [`Cheapest for ${n} item${n === 1 ? '' : 's'}`, where].filter(Boolean).join(' · ') }
      })
  }, [state])

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Suppliers">
      <View>
        {rows.map((r, i) => (
          <ListRow key={r.s.id} title={r.s.name} detail={r.detail} last={i === rows.length - 1} />
        ))}
        <Text style={styles.sheetHint}>
          {rows.length
            ? 'To add one, save a buying price on the Prices tab and type their name.'
            : "No suppliers yet. They're added when you save a buying price on the Prices tab."}
        </Text>
      </View>
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flex: 1, justifyContent: 'flex-end', paddingBottom: 40, gap: 2 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  avatarText: { fontFamily: fonts.extrabold, fontSize: 26, color: colors.brand },
  name: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: colors.ink },
  // Ink at 70% rather than a grey: grey on yellow looks dirty
  shop: { fontFamily: fonts.semibold, fontSize: 16, color: 'rgba(17,17,17,0.7)' },
  backup: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: space.sm },
  backupDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(17,17,17,0.35)' },
  backupDotOn: { backgroundColor: colors.success },
  backupText: { fontFamily: fonts.medium, fontSize: 13, color: 'rgba(17,17,17,0.7)' },

  signOut: {
    marginTop: space.xl,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { ...type.button, color: colors.ink },

  deleteLink: { alignSelf: 'center', paddingVertical: space.lg, marginTop: space.sm },
  deleteLinkText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
  confirm: { marginTop: space.lg, gap: space.md, padding: space.lg, borderRadius: radius.md, backgroundColor: '#FDECEA' },
  confirmTitle: { ...type.bodyStrong, color: colors.ink },
  confirmText: { ...type.caption, color: colors.ink },
  confirmRow: { flexDirection: 'row', gap: space.sm },
  keep: { height: 48, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  keepText: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  delete: { height: 48, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  deleteText: { fontFamily: fonts.bold, fontSize: 15, color: colors.surface },

  form: { gap: space.lg },
  sheetLead: { ...type.body, color: colors.ink },
  days: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -space.xs },
  dayCell: { width: '50%', padding: space.xs },
  day: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: colors.field,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: colors.brandSoft, borderColor: colors.ink },
  dayText: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sheetHint: { ...type.caption, color: colors.quiet, paddingTop: space.md },
})
