import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { actions as A, createSeedState, type AppState, type StoreApi } from './core'
import { fetchBackup, pushBackup, type BackupStatus } from './lib/cloudBackup'

// Exported so a second store (src/data/sqliteStore.tsx) can feed the same useStore()
export const StoreContext = createContext<StoreApi | null>(null)

async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/**
 * Same API as the web store; only persistence differs.
 *
 * `ownerId` is the signed-in account, or null when nobody is. While it is null
 * nothing is hydrated and children render straight away, because the auth
 * screens do not use the store and must not wait behind it.
 */
export function StoreProvider({
  children,
  fallback,
  ownerId = null,
}: {
  children: ReactNode
  fallback: ReactNode
  ownerId?: string | null
}) {
  const [state, setState] = useState<AppState | null>(null)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [online, setOnline] = useState(true)
  const [backupStatus, setBackupStatus] = useState<BackupStatus>('idle')
  // The latest state for event handlers (recording a sale, saving a product),
  // which run outside render. Updated after each commit rather than during
  // render: writing a ref mid-render is unsafe once React can re-run renders,
  // and a layout effect runs before anything can be tapped, so handlers never
  // see a stale value.
  const ref = useRef(state)
  const photosRef = useRef(photos)
  useLayoutEffect(() => {
    ref.current = state
    photosRef.current = photos
  }, [state, photos])
  // Hydration assigns state once; that assignment must not trigger an upload of
  // what was just downloaded.
  const skipNextPush = useRef(true)

  // Hydrate for the signed-in owner. Restore has to be awaited before seeding,
  // otherwise a returning owner is handed demo data and their backup is then
  // overwritten by it.
  useEffect(() => {
    // Signed out: nothing to hydrate. Any state still in memory is unreachable
    // because children render without the provider, and this effect re-runs and
    // reloads from disk as soon as an owner signs in.
    if (!ownerId) return
    let alive = true
    skipNextPush.current = true
    ;(async () => {
      const [saved, savedPhotos, savedOwner] = await Promise.all([
        load<unknown>(A.STATE_KEY),
        load<Record<string, string>>(A.PHOTO_KEY),
        load<string>(A.OWNER_KEY),
      ])
      if (!alive) return

      // State left by a different account must never be adopted by this one.
      const mine = savedOwner === null || savedOwner === ownerId
      if (A.isValidState(saved) && mine) {
        // Saved before onboarding existed? Decide once, here, rather than
        // sending a shop that is already running through setup again.
        setState(A.migrateState(saved))
        setPhotos(savedPhotos ?? {})
      } else {
        const restored = await fetchBackup()
        if (!alive) return
        setState(restored ? A.migrateState(restored) : createSeedState())
        // Photos are device-only, so there is nothing to restore for another account
        setPhotos(mine ? (savedPhotos ?? {}) : {})
        if (!mine) AsyncStorage.removeItem(A.PHOTO_KEY).catch(() => {})
      }
      AsyncStorage.setItem(A.OWNER_KEY, ownerId).catch(() => {})
    })()
    return () => {
      alive = false
    }
  }, [ownerId])

  // Local-first: every change is committed to this device (BR8).
  useEffect(() => {
    if (state) AsyncStorage.setItem(A.STATE_KEY, JSON.stringify(state)).catch(() => {})
  }, [state])

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), [])

  const pending = state ? A.pendingCount(state) : 0

  const runBackup = useCallback(async () => {
    const current = ref.current
    if (!current || !ownerId) return
    setBackupStatus('pushing')
    const ok = await pushBackup(current, ownerId)
    setBackupStatus(ok ? 'backed-up' : 'error')
    // Only acknowledge the queue once the upload actually succeeded
    if (ok) {
      skipNextPush.current = true
      setState((s) => s && A.markBackedUp(s))
    }
  }, [ownerId])

  // Debounced snapshot upload. A failure leaves the status alone and the next
  // change retries; nothing claims to be backed up in the meantime.
  useEffect(() => {
    if (!state || !ownerId || !online) return
    if (skipNextPush.current) {
      skipNextPush.current = false
      return
    }
    setBackupStatus((s) => (s === 'backed-up' ? 'idle' : s))
    const t = setTimeout(() => void runBackup(), A.BACKUP_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [state, ownerId, online, runBackup])

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => s && fn(s)), [])

  const recordSale = useCallback<StoreApi['recordSale']>(
    (lines, meta) => {
      const check = A.recordSale(ref.current!, lines, meta)
      if (check.ok) update((s) => A.recordSale(s, lines, meta).state ?? s)
      return { ok: check.ok, message: check.message } as A.Result
    },
    [update],
  )

  const createOrderList = useCallback<StoreApi['createOrderList']>(
    (lines) => {
      const created = A.planOrders(ref.current!, lines)
      update((s) => A.addOrders(s, created))
      return created
    },
    [update],
  )

  const addProduct = useCallback<StoreApi['addProduct']>(
    (input) => {
      const product = A.createProduct(ref.current!, input)
      update((s) => A.addProduct(s, product))
      return product
    },
    [update],
  )

  const setPhoto = useCallback<StoreApi['setPhoto']>(async (productId, dataUrl) => {
    const next = { ...photosRef.current, [productId]: dataUrl }
    try {
      await AsyncStorage.setItem(A.PHOTO_KEY, JSON.stringify(next))
    } catch {
      return { ok: false, message: A.PHOTO_FULL_MESSAGE }
    }
    setPhotos(next)
    return { ok: true, message: A.PHOTO_SAVED_MESSAGE }
  }, [])

  const removePhoto = useCallback((productId: string) => {
    setPhotos((prev) => {
      const next = { ...prev }
      delete next[productId]
      AsyncStorage.setItem(A.PHOTO_KEY, JSON.stringify(next)).catch(() => {})
      return next
    })
  }, [])

  const value = useMemo<StoreApi | null>(
    () =>
      state && {
        state,
        photos,
        online,
        pending,
        backupStatus,
        backUpNow: () => void runBackup(),
        recordSale,
        createOrderList,
        addProduct,
        updateProduct: (id, input) => update((s) => A.updateProduct(s, id, input)),
        receivePurchase: (id) => update((s) => A.receivePurchase(s, id)),
        // Planned against the latest state (for the ids), committed functionally
        receiveRestock: (lines) => {
          const clean = lines.filter((l) => l.qty > 0)
          if (!clean.length) return []
          const created = A.planOrders(ref.current!, clean)
          update((s) => A.receivePlanned(s, created))
          return created.map((po) => po.id)
        },
        undoRestock: (ids) => update((s) => A.undoRestock(s, ids)),
        setRestockDay: (day) => update((s) => A.setRestockDay(s, day)),
        cancelPurchase: (id) => update((s) => A.cancelPurchase(s, id)),
        upsertSupplierPrice: (input) => update((s) => A.upsertSupplierPrice(s, input)),
        setPreferredSupplier: (productId, supplierId) => update((s) => A.setPreferredSupplier(s, productId, supplierId)),
        setBudget: (n) => update((s) => A.setBudget(s, n)),
        updateProfile: (p) => update((s) => A.updateProfile(s, p)),
        finishOnboarding: (sel, profile, counts) => update((s) => A.applyStarterPacks(s, sel, profile, counts)),
        skipOnboarding: (profile) => update((s) => A.skipOnboarding(s, profile)),
        setStockCounts: (counts) => update((s) => A.setStockCounts(s, counts)),
        updateSellGrid: (patch) => update((s) => A.updateSellGrid(s, patch)),
        // Same pattern as addProduct: build once (so the caller gets the exact
        // product back), then commit with a functional update so two calls in
        // one tap can't overwrite each other
        saveMenuItem: (input, id) => {
          const product = A.buildMenuItem(ref.current!, input, id)
          update((s) => A.upsertProduct(s, product))
          return product
        },
        removeMenuItem: (id) => update((s) => A.removeMenuItem(s, id)),
        addIngredient: (input) => {
          const product = A.buildIngredient(input)
          update((s) => A.upsertProduct(s, product))
          return product
        },
        setPhoto,
        removePhoto,
        resetDemoData: () => setState(createSeedState()),
      },
    [state, photos, online, pending, backupStatus, runBackup, recordSale, createOrderList, addProduct, setPhoto, removePhoto, update],
  )

  // Nobody is signed in: the auth screens need no store and must not be blocked
  if (!ownerId) return <>{children}</>
  // `value` is `state && {…}`, so this is the same test — on the plain state,
  // not on the object of handlers
  if (!state) return <>{fallback}</>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}

/**
 * The store if there is one, null if nobody is signed in.
 *
 * Only the root navigator needs this: it renders on both sides of the auth
 * guard, and signed out there is deliberately no store to read.
 */
export function useStoreOptional() {
  return useContext(StoreContext)
}
