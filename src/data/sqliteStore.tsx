/**
 * The shop, kept in SQLite through the use cases (EXPO_PUBLIC_STORE=sqlite).
 *
 * The screens still get the same useStore(): `state` is the same AppState and the actions are the same
 * members, so no screen changes. What differs is where the data lives:
 *
 *   an action   -> A.<action>(state) shows the result at once (the counter must not wait for a database)
 *               -> then the use cases write it to SQLite, one change after another
 *               -> then loadShop reads the shop back, which swaps in real ids, stock and the sync queue
 *   syncing     -> useCases.syncNow() sends the queued rows to Supabase while online
 *
 * Everything the screens show comes back from loadShop: products, sales and voids, orders, budget, profile,
 * preferred suppliers, the sell grid, the restock day and the onboarding flag. Only product photos are
 * still kept on the phone (AsyncStorage).
 */


import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import * as A from './actions'
import type { AppState } from './types'
import type { BackupStatus } from '../lib/cloudBackup'
import { StoreContext } from '../store'
import { useCases } from '../backend/useCases/container'
import { emptyShop, failed, newId, persistChange, persistCosts, persistSale, persistVoid, uuidify } from './sqlitePersist'
const SYNC_EVERY_MS = 60_000

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
  // Kept in step after each render, for actions and timers that run later
  const photosRef = useRef(photos)
  const ownerRef = useRef(ownerId)
  const onlineRef = useRef(online)
  useEffect(() => {
    photosRef.current = photos
    ownerRef.current = ownerId
    onlineRef.current = online
  }, [photos, ownerId, online])
  // Whose shop `state` is. Switching accounts shows the fallback until the new shop has loaded.
  const [stateOwner, setStateOwner] = useState<string | null>(null)
  const jobs = useRef(0)
  const chain = useRef<Promise<unknown>>(Promise.resolve())
  const syncing = useRef(false)
  // The screen's copy of a new sale has a placeholder id until the next refresh; this maps it to the real one
  const saleIds = useRef(new Map<string, string>())

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
      commit(shop)
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
    // Actions and refreshes wait for the new shop; the screen waits on stateOwner below
    ref.current = null
    ;(async () => {
      try {
        const claim = await useCases.claimDevice({ ownerID: ownerId })
        if (!claim.success) throw new Error(claim.errors?.join(', '))
        const rawPhotos = await AsyncStorage.getItem(A.PHOTO_KEY).catch(() => null)
        const shop = await useCases.loadShop()
        if (!alive) return
        commit(shop)
        setStateOwner(ownerId)
        if (claim.cleared) AsyncStorage.removeItem(A.PHOTO_KEY).catch(() => {})
        try {
          setPhotos(!claim.cleared && rawPhotos ? JSON.parse(rawPhotos) : {})
        } catch {
          setPhotos({})
        }
      } catch (e) {
        console.error('[sqliteStore] could not open the shop', e)
        if (alive) {
          commit(emptyShop())
          setStateOwner(ownerId)
        }
      }
    })()
    return () => {
      alive = false
    }
  }, [ownerId, commit])

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), [])

  // Send queued rows when we come online, and every minute after.
  // Only this owner's shop: during an account switch `state` still holds the last one
  const shown = state && stateOwner === ownerId ? state : null
  const ready = shown !== null
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
          const before = ref.current.preferred
          const preferred = Object.fromEntries(Object.entries(before).map(([p, s]) => [p, supplierIds.get(s) ?? s]))
          commit({ ...ref.current, preferred })
          for (const [productId, supplierId] of Object.entries(preferred)) {
            if (before[productId] === supplierId) continue
            errors.push(...failed(await useCases.setPreferredSupplier({ productId, supplierId }), 'setPreferredSupplier'))
          }
        }
        return errors
      })
    }
    /** Shows the new state now, then runs one use case and reports what it said. */
    const save = (next: AppState, what: string, call: () => Promise<{ success?: boolean; errors?: string[] } | undefined>) => {
      commit(next)
      enqueue(async () => failed(await call(), what))
    }

    /** An order change: the order use case first, then the costs that came with it. */
    const saveOrder = (next: AppState, what: string, call: () => Promise<{ success?: boolean; errors?: string[] } | undefined>) => {
      const prev = cur()
      commit(next)
      enqueue(async () => [...failed(await call(), what), ...(await persistCosts(useCases, prev, next))])
    }

    const api: Pick<
      A.StoreApi,
      | 'recordSale' | 'updateSellGrid' | 'saveMenuItem' | 'removeMenuItem' | 'addIngredient' | 'setPortion' | 'applyKitchen' | 'createOrderList'
      | 'receivePurchase' | 'receiveRestock' | 'undoRestock' | 'setRestockDay' | 'voidSale' | 'cancelPurchase' | 'addProduct' | 'updateProduct' | 'upsertSupplierPrice' | 'setPreferredSupplier'
      | 'setBudget' | 'updateProfile' | 'finishOnboarding' | 'skipOnboarding' | 'setStockCounts' | 'resetDemoData'
    > = {
      recordSale: (lines, meta) => {
        const check = A.recordSale(cur(), lines, meta)
        if (!check.ok || !check.state) return { ok: false, message: check.message }
        commit(check.state)
        const owner = ownerRef.current!
        const placeholder = check.state.sales[check.state.sales.length - 1].id
        enqueue(() => persistSale(useCases, owner, lines, meta, (realId) => saleIds.current.set(placeholder, realId)))
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
        save(A.upsertProduct(cur(), product), 'saveMenuItem', () =>
          useCases.saveMenuItem({ id: product.id, name: input.name, price: input.price, menu: input.menu, recipe: input.recipe }),
        )
        return product
      },
      removeMenuItem: (id) => {
        const next = A.removeMenuItem(cur(), id)
        if (next !== cur()) save(next, 'removeMenuItem', () => useCases.removeMenuItem({ id }))
      },
      addIngredient: (input) => {
        const product = { ...A.buildIngredient(input), id: newId() }
        save(A.upsertProduct(cur(), product), 'addIngredient', () =>
          useCases.addIngredient({
            id: product.id,
            name: product.name,
            unit: product.unit,
            unitPlural: product.unitPlural,
            packSize: product.packSize,
            packLabel: product.packLabel,
            cost: product.cost,
            portion: product.portion,
          }),
        )
        return product
      },
      // The portion is in the product's meta and the rescaled recipes are recipe rows; persistChange writes both
      setPortion: (productId, portion) => change((s) => A.setPortion(s, productId, portion)),
      // A new ingredient (potatoes) needs a uuid here; persistChange writes it, the rebuilt recipes and any new portion
      applyKitchen: (kitchen) => change((s) => A.applyKitchen(s, kitchen, () => newId())),
      setStockCounts: (counts) => {
        const at = Date.now()
        const next = A.setStockCounts(cur(), counts, at)
        save(next, 'setStockCounts', () => useCases.setStockCounts({ counts, at }))
      },
      upsertSupplierPrice: (input) => change((s) => A.upsertSupplierPrice(s, input)),

      finishOnboarding: (sel, profile, counts) => {
        const started = A.applyStarterPacks(cur(), sel, profile, counts)
        const { products, prices, preferred } = uuidify(started)
        const next = { ...started, products, prices, preferred }
        const recipes = Object.fromEntries(products.filter((p) => p.composite && p.recipe?.length).map((p) => [p.id, p.recipe]))
        const stock = Object.fromEntries(products.filter((p) => !p.composite).map((p) => [p.id, p.stock]))
        save(next, 'applyStarterPacks', () => useCases.applyStarterPacks({ products, recipes, counts: stock, profile: next.profile }))
      },
      skipOnboarding: (profile) => {
        // A new shop stays empty (no sample catalogue); one that already has products keeps them. The
        // onboarding flag and the profile follow in the next write.
        change((s) => A.skipOnboarding(s, profile))
        const { profile: saved, onboardedAt } = cur()
        enqueue(async () => failed(await useCases.markOnboarded({ profile: saved, at: onboardedAt ?? Date.now() }), 'markOnboarded'))
      },

      // Orders live in SQLite. Receiving one adds its stock in the same write; undoing takes it back out.
      createOrderList: (lines) => {
        const created = A.planOrders(cur(), lines)
        save(A.addOrders(cur(), created), 'savePurchaseOrders', () => useCases.savePurchaseOrders({ orders: created }))
        return created
      },
      receivePurchase: (id) => {
        const next = A.receivePurchase(cur(), id)
        if (next !== cur()) saveOrder(next, 'receivePurchaseOrder', () => useCases.receivePurchaseOrder({ id, receivedAt: Date.now() }))
      },
      // "Bought it": the purchases are recorded as delivered and the stock goes in, in one write
      receiveRestock: (lines) => {
        const clean = lines.filter((l) => l.qty > 0)
        if (!clean.length) return []
        const created = A.planOrders(cur(), clean)
        const next = A.receivePlanned(cur(), created)
        const ids = created.map((po) => po.id)
        const delivered = next.purchases.filter((p) => ids.includes(p.id))
        saveOrder(next, 'savePurchaseOrders', () => useCases.savePurchaseOrders({ orders: delivered }))
        return ids
      },
      // Undo takes the stock back out; the trip's lines say how much, and the count may end up below zero
      undoRestock: (ids) => {
        const next = A.undoRestock(cur(), ids)
        if (next === cur()) return
        const gone = cur().purchases.filter((p) => ids.includes(p.id)).map((p) => p.id)
        saveOrder(next, 'undoPurchaseOrders', () => useCases.undoPurchaseOrders({ ids: gone }))
      },
      setRestockDay: (day) => {
        const next = A.setRestockDay(cur(), day)
        if (next !== cur()) save(next, 'setRestockDay', () => useCases.setRestockDay({ day }))
      },
      cancelPurchase: (id) => {
        const next = A.cancelPurchase(cur(), id)
        if (next !== cur()) save(next, 'cancelPurchaseOrder', () => useCases.cancelPurchaseOrder({ id }))
      },
      // Takes a sale back: its stock returns and it moves to voidedSales
      voidSale: (saleId) => {
        const next = A.voidSale(cur(), saleId)
        if (next === cur()) return
        commit(next)
        enqueue(() => persistVoid(useCases, saleIds.current.get(saleId) ?? saleId))
      },

      setPreferredSupplier: (productId, supplierId) =>
        save(A.setPreferredSupplier(cur(), productId, supplierId), 'setPreferredSupplier', () => useCases.setPreferredSupplier({ productId, supplierId })),
      setBudget: (n) => {
        const next = A.setBudget(cur(), n)
        save(next, 'setBudget', () => useCases.setBudget({ amount: next.budget }))
      },
      updateProfile: (p) => save(A.updateProfile(cur(), p), 'updateProfile', () => useCases.updateProfile(p)),
      updateSellGrid: (patch) => save(A.updateSellGrid(cur(), patch), 'saveSellGrid', () => useCases.saveSellGrid({ patch })),

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
      shown && {
        ...actions,
        state: shown,
        photos,
        online,
        pending: A.pendingCount(shown),
        backupStatus,
        backUpNow: () => void sync(true),
        setPhoto,
        removePhoto,
      },
    [shown, photos, online, backupStatus, actions, sync, setPhoto, removePhoto],
  )

  if (!ownerId) return <>{children}</>
  // `value` is `shown && {…}`, so testing `shown` is the same test
  if (!shown) return <>{fallback}</>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}