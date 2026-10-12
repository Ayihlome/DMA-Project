/**
 * The shop, kept in SQLite through the use cases (EXPO_PUBLIC_STORE=sqlite).
 *
 * The screens still get the same useStore(): `state` is the same AppState and the actions are the same
 * 26 members, so no screen changes. What differs is where the data lives:
 *
 *   an action   -> A.<action>(state) shows the result at once (the counter must not wait for a database)
 *               -> then the use cases write it to SQLite, one change after another
 *               -> then loadShop reads the shop back, which swaps in real ids, stock and the sync queue
 *   syncing     -> useCases.syncNow() sends the queued rows to Supabase while online
 *
 * Budget, profile, preferred supplier, the onboarding flag, the sell grid and purchase orders have no
 * use case yet, so they are kept on the phone (AsyncStorage, per account) and laid over what loadShop
 * returns. Move each one into SQLite when its use case lands, and delete it from the overlay.
 */


import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import * as A from './actions'
import { createSeedState } from './seed'
import type { AppState } from './types'
import type { BackupStatus } from '../lib/cloudBackup'
import { StoreContext } from '../store'
import { useCases } from '../backend/useCases/container'
import { demoShop, emptyShop, newId, overlayOf, persistChange, persistReceive, persistSale, uuidify, withOverlay, type Overlay } from './sqlitePersist'
const overlayKey = (ownerId: string) => `stockevo-sqlite-overlay:${ownerId}`
const SYNC_EVERY_MS = 60_000

function parseOverlay(raw: string | null): Overlay | null {
  try {
    const o = raw ? JSON.parse(raw) : null
    return o && Array.isArray(o.purchases) && o.preferred && o.profile && typeof o.budget === 'number' ? (o as Overlay) : null
  } catch {
    return null
  }
}

export function SqliteStoreProvider({
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

  // The newest state, readable right after an action. Actions run one after another on the JS
  // thread, so each one starts from the result of the last.
  const ref = useRef<AppState | null>(null)
  const photosRef = useRef(photos)
  photosRef.current = photos
  const ownerRef = useRef(ownerId)
  ownerRef.current = ownerId
  const onlineRef = useRef(online)
  onlineRef.current = online
  const jobs = useRef(0)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const syncing = useRef(false)

  const commit = useCallback((next: AppState) => {
    ref.current = next
    setState(next)
  }, [])

  // Re-reads the shop from SQLite. Skipped while a write is still waiting, because what
  // is on screen is then newer than the database; the last write triggers another refresh.
  const refresh = useCallback(async () => {
    if (jobs.current > 0) return
    try {
      const shop = await useCases.loadShop()
      if (jobs.current > 0 || !ref.current) return
      commit(withOverlay(shop, overlayOf(ref.current)))
    } catch (e) {
      console.warn('[sqliteStore] loadShop failed', e)
    }
  }, [commit])

  const sync = useCallback(
    async (force = false) => {
      const current = ref.current
      if (syncing.current || !ownerRef.current || !current) return
      if (!force && A.pendingCount(current) === 0) return
      syncing.current = true
      setBackupStatus('pushing')
      try {
        await useCases.syncNow({ retryFailed: force })
      } catch (e) {
        console.warn('[sqliteStore] sync failed', e)
      } finally {
        syncing.current = false
      }
      await refresh()
      setBackupStatus(ref.current && A.pendingCount(ref.current) === 0 ? 'backed-up' : 'error')
    },
    [refresh],
  )

  // Writes to SQLite in the order the owner made the changes.
  const enqueue = useCallback(
    (job: () => Promise<string[]>) => {
      jobs.current++
      chain.current = chain.current
        .then(job)
        .catch((e) => [String(e?.message ?? e)])
        .then(async (errors) => {
          jobs.current--
          if (errors.length) console.warn('[sqliteStore] not saved:', errors.join(' | '))
          if (jobs.current === 0) {
            await refresh()
            if (onlineRef.current) void sync()
          }
        })
    },
    [refresh, sync],
  )

  // Load the signed-in owner's shop. claimDevice clears the phone first if it holds someone else's.
  useEffect(() => {
    if (!ownerId) return
    let alive = true
    ref.current = null
    setState(null)
    ;(async () => {
      try {
        const claim = await useCases.claimDevice({ ownerID: ownerId })
        if (!claim.success) throw new Error(claim.errors?.join(', '))
        const [rawOverlay, rawPhotos] = await Promise.all([
          AsyncStorage.getItem(overlayKey(ownerId)).catch(() => null),
          AsyncStorage.getItem(A.PHOTO_KEY).catch(() => null),
        ])
        const shop = await useCases.loadShop()
        if (!alive) return
        commit(withOverlay(shop, claim.cleared ? null : parseOverlay(rawOverlay)))
        if (claim.cleared) AsyncStorage.removeItem(A.PHOTO_KEY).catch(() => {})
        try {
          setPhotos(!claim.cleared && rawPhotos ? JSON.parse(rawPhotos) : {})
        } catch {
          setPhotos({})
        }
      } catch (e) {
        console.error('[sqliteStore] could not open the shop', e)
        if (alive) commit(emptyShop())
      }
    })()
    return () => {
      alive = false
    }
  }, [ownerId, commit])

  // The fields that have no use case yet stay on the phone.
  useEffect(() => {
    if (state && ownerId) AsyncStorage.setItem(overlayKey(ownerId), JSON.stringify(overlayOf(state))).catch(() => {})
  }, [state, ownerId])

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), [])

  // Send queued rows when we come online, and every minute after.
  const ready = state !== null
  useEffect(() => {
    if (!ready || !online || !ownerId) return
    void sync()
    const t = setInterval(() => void sync(), SYNC_EVERY_MS)
    return () => clearInterval(t)
  }, [ready, online, ownerId, sync])

  const actions = useMemo(() => {
    const cur = () => ref.current!

    /** Shows the new state now, then writes the difference through the use cases. */
    const change = (fn: (s: AppState) => AppState) => {
      const prev = cur()
      const next = fn(prev)
      if (next === prev) return
      commit(next)
      enqueue(async () => {
        const { errors, supplierIds } = await persistChange(useCases, prev, next)
        // A supplier typed on screen gets its real id from the database; the saved choices follow it
        if (supplierIds.size && ref.current) {
          const preferred = Object.fromEntries(Object.entries(ref.current.preferred).map(([p, s]) => [p, supplierIds.get(s) ?? s]))
          commit({ ...ref.current, preferred })
        }
        return errors
      })
    }
    /** Fields with no use case: on screen and on the phone only. */
    const local = (fn: (s: AppState) => AppState) => commit(fn(cur()))

    const api: Pick<
      A.StoreApi,
      | 'recordSale' | 'updateSellGrid' | 'saveMenuItem' | 'removeMenuItem' | 'addIngredient' | 'createOrderList'
      | 'receivePurchase' | 'cancelPurchase' | 'addProduct' | 'updateProduct' | 'upsertSupplierPrice' | 'setPreferredSupplier'
      | 'setBudget' | 'updateProfile' | 'finishOnboarding' | 'skipOnboarding' | 'setStockCounts' | 'resetDemoData'
    > = {
      recordSale: (lines, meta) => {
        const check = A.recordSale(cur(), lines, meta)
        if (!check.ok || !check.state) return { ok: false, message: check.message }
        commit(check.state)
        const owner = ownerRef.current!
        enqueue(() => persistSale(useCases, owner, lines, meta))
        return { ok: true, message: check.message }
      },

      addProduct: (input) => {
        const product = { ...A.createProduct(cur(), input), id: newId() }
        change((s) => A.addProduct(s, product))
        return product
      },
      updateProduct: (id, input) => change((s) => A.updateProduct(s, id, input)),
      saveMenuItem: (input, id) => {
        const built = A.buildMenuItem(cur(), input, id)
        // A new item gets a uuid; an edit keeps the id it has
        const product = id && cur().products.some((p) => p.id === id) ? built : { ...built, id: newId() }
        change((s) => A.upsertProduct(s, product))
        return product
      },
      removeMenuItem: (id) => change((s) => A.removeMenuItem(s, id)),
      addIngredient: (input) => {
        const product = { ...A.buildIngredient(input), id: newId() }
        change((s) => A.upsertProduct(s, product))
        return product
      },
      setStockCounts: (counts) => change((s) => A.setStockCounts(s, counts)),
      upsertSupplierPrice: (input) => change((s) => A.upsertSupplierPrice(s, input)),

      finishOnboarding: (sel, profile, counts) =>
        change((s) => {
          const started = A.applyStarterPacks(s, sel, profile, counts)
          const { products, prices, preferred } = uuidify(started)
          return { ...started, products, prices, preferred }
        }),
      skipOnboarding: (profile) =>
        change((s) => {
          // An empty shop gets the demo catalogue; one that already has products keeps them
          const demo = s.products.length ? null : demoShop(createSeedState())
          const base = demo ? { ...s, products: demo.products, suppliers: demo.suppliers, prices: demo.prices, preferred: demo.preferred } : s
          return A.skipOnboarding(base, profile)
        }),

      // Orders have no use case yet; receiving one does add the stock, through receiveStock
      createOrderList: (lines) => {
        const created = A.planOrders(cur(), lines)
        local((s) => A.addOrders(s, created))
        return created
      },
      receivePurchase: (id) => {
        const order = cur().purchases.find((p) => p.id === id)
        const next = A.receivePurchase(cur(), id)
        if (!order || next === cur()) return
        commit(next)
        enqueue(() => persistReceive(useCases, order.lines))
      },
      cancelPurchase: (id) => local((s) => A.cancelPurchase(s, id)),

      setPreferredSupplier: (productId, supplierId) => local((s) => A.setPreferredSupplier(s, productId, supplierId)),
      setBudget: (n) => local((s) => A.setBudget(s, n)),
      updateProfile: (p) => local((s) => A.updateProfile(s, p)),
      updateSellGrid: (patch) => local((s) => A.updateSellGrid(s, patch)),

      resetDemoData: () => {
        commit(emptyShop())
        const owner = ownerRef.current!
        enqueue(async () => {
          const r = await useCases.claimDevice({ ownerID: owner, reset: true })
          return r.success ? [] : (r.errors ?? ['claimDevice failed'])
        })
      },
    }
    return api
  }, [commit, enqueue])

  const setPhoto = useCallback<A.StoreApi['setPhoto']>(async (productId, dataUrl) => {
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

  const value = useMemo<A.StoreApi | null>(
    () =>
      state && {
        ...actions,
        state,
        photos,
        online,
        pending: A.pendingCount(state),
        backupStatus,
        backUpNow: () => void sync(true),
        setPhoto,
        removePhoto,
      },
    [state, photos, online, backupStatus, actions, sync, setPhoto, removePhoto],
  )

  if (!ownerId) return <>{children}</>
  if (!value) return <>{fallback}</>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}