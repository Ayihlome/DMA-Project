import React, { useState } from 'react'
import { View, Text, ScrollView, TouchableOpacity, TextInput, Platform, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MaterialIcons from '../../components/common/MaterialIcon'
import AppHeader from '../../components/common/AppHeader'
import { colors, spacing, radius, type } from '../../theme/theme'
import { useStore } from '../../store'
import { useAuth } from '../../providers/AuthProvider'
import { supabase } from '../../lib/supabase'
import { actions, dashboardKpis, longDate, rand } from '../../core'
import { QUEUE_KEY } from '../../lib/telemetry'

/** Alert's buttons do nothing on web, so confirmation falls back to window.confirm. */
function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm()
    return
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ])
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`)
  else Alert.alert(title, message)
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const store = useStore()
  const { signOut } = useAuth()
  const { state } = store

  const [editing, setEditing] = useState(false)
  const [ownerName, setOwnerName] = useState(state.profile.ownerName)
  const [storeName, setStoreName] = useState(state.profile.storeName)
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  const kpis = dashboardKpis(state)

  function saveProfile() {
    store.updateProfile({ ownerName: ownerName.trim() || state.profile.ownerName, storeName: storeName.trim() || state.profile.storeName })
    setEditing(false)
  }

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

  function askDelete() {
    confirm(
      'Delete my account',
      'This removes your account and every product, sale and supplier price belonging to it, on this device and in the cloud. It cannot be undone.',
      'Delete',
      () => void deleteAccount(),
    )
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
      await AsyncStorage.multiRemove([actions.STATE_KEY, actions.PHOTO_KEY, QUEUE_KEY]).catch(() => {})
      // The session is already invalid server-side; this clears the local token.
      await signOut().catch(() => {})
    } finally {
      setDeleting(false)
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader screenLabel="Profile" />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          {editing ? (
            <>
              <Text style={styles.inputLabel}>Your name</Text>
              <TextInput style={styles.input} value={ownerName} onChangeText={setOwnerName} placeholder="Your name" placeholderTextColor={colors.textSecondary} />
              <Text style={styles.inputLabel}>Shop name</Text>
              <TextInput style={styles.input} value={storeName} onChangeText={setStoreName} placeholder="Shop name" placeholderTextColor={colors.textSecondary} />
              <View style={styles.editRow}>
                <TouchableOpacity onPress={() => { setOwnerName(state.profile.ownerName); setStoreName(state.profile.storeName); setEditing(false) }} style={[styles.btn, styles.btnGhost]}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveProfile} style={[styles.btn, styles.btnPrimary]}>
                  <Text style={styles.btnPrimaryText}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.name}>{state.profile.ownerName}</Text>
              <Text style={styles.meta}>{state.profile.role} · {state.profile.storeName}</Text>
              <Text style={styles.meta}>Member since {longDate(state.profile.memberSince)}</Text>
              {/* States only what is true: shop data is not uploaded yet, so this
                  deliberately does not read the simulated sync queue. */}
              <View style={styles.storageRow}>
                <MaterialIcons
                  name={store.online ? 'save' : 'cloud_off'}
                  size={16}
                  color={store.online ? colors.secondary : colors.warningDefault}
                />
                <Text style={styles.storageText}>
                  {store.online ? 'Saved on this device' : 'Offline · saved on this device'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditing(true)} style={[styles.btn, styles.btnGhost, { marginTop: spacing.sm }]}>
                <MaterialIcons name="edit" size={18} color={colors.primary} />
                <Text style={styles.btnGhostText}>Edit profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Stock value</Text>
            <Text style={styles.statValue}>{rand(kpis.stockValue)}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Items tracked</Text>
            <Text style={styles.statValue}>{kpis.itemCount}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Need attention</Text>
            <Text style={styles.statValue}>{kpis.attention.length}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your data</Text>
        <View style={styles.card}>
          {/* expo-print and expo-sharing have no web implementation */}
          {Platform.OS !== 'web' && (
            <TouchableOpacity onPress={exportReport} disabled={exporting} style={styles.listRow}>
              <MaterialIcons name="picture_as_pdf" size={20} color={colors.primary} />
              <Text style={styles.listLabel}>{exporting ? 'Preparing report…' : 'Export a PDF report'}</Text>
              {exporting ? <ActivityIndicator size="small" color={colors.primary} /> : <MaterialIcons name="chevron_right" size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/privacy')} style={styles.listRow}>
            <MaterialIcons name="shield" size={20} color={colors.primary} />
            <Text style={styles.listLabel}>Privacy notice</Text>
            <MaterialIcons name="chevron_right" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Danger zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerText}>
            Deleting your account removes it permanently, with every product, sale and supplier price
            belonging to it. This cannot be undone.
          </Text>
          <TouchableOpacity onPress={askDelete} disabled={deleting} style={[styles.btn, styles.btnDanger]}>
            {deleting
              ? <ActivityIndicator size="small" color={colors.onPrimary} />
              : <MaterialIcons name="delete_forever" size={18} color={colors.onPrimary} />}
            <Text style={styles.btnDangerText}>{deleting ? 'Deleting…' : 'Delete my account'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgBase },
  scroll: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: spacing.sm },

  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs2,
  },
  name: { ...type.h2, color: colors.textPrimary },
  meta: { ...type.caption, color: colors.textSecondary },
  storageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs2 },
  storageText: { ...type.captionMedium, color: colors.textSecondary },

  statRow: { flexDirection: 'row', gap: spacing.sm },
  stat: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 2,
  },
  statLabel: { ...type.caption, color: colors.textSecondary },
  statValue: { ...type.bodyMedium, color: colors.textPrimary, fontWeight: '700' },

  sectionTitle: { ...type.captionMedium, color: colors.textSecondary, marginTop: spacing.sm },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  listLabel: { ...type.body, color: colors.textPrimary, flex: 1 },

  inputLabel: { ...type.captionMedium, color: colors.textSecondary },
  input: {
    ...type.body,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    minHeight: 48,
  },
  editRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: radius.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    flex: 1,
  },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { ...type.bodyMedium, color: colors.onPrimary, fontWeight: '700' },
  btnGhost: { borderWidth: 1, borderColor: colors.borderDefault },
  btnGhostText: { ...type.bodyMedium, color: colors.primary, fontWeight: '700' },

  dangerCard: { borderColor: colors.errorDefault },
  dangerText: { ...type.caption, color: colors.textSecondary, lineHeight: 18 },
  btnDanger: { backgroundColor: colors.errorDefault, marginTop: spacing.xs },
  btnDangerText: { ...type.bodyMedium, color: colors.onPrimary, fontWeight: '700' },
})
