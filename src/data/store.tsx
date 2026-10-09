import { createContext, type Context, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { AppState } from './types'
import { createSeedState } from './seed'
import * as A from './actions'
import type { StoreApi } from './actions'

const LEGACY_PHOTO_KEY = 'sisonke-product-images'

// Keep one context instance across hot reloads: if this module is re-executed, a new
// createContext() would no longer match the provider that is already mounted.
const g = globalThis as typeof globalThis & { __stockevoStoreContext?: Context<StoreApi | null> }
const StoreContext = (g.__stockevoStoreContext ??= createContext<StoreApi | null>(null))

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(A.STATE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    if (A.isValidState(parsed)) return parsed
  } catch {
    /* fall through to seed */
  }
  return createSeedState()
}

function loadPhotos(): Record<string, string> {
  try {
    const current = localStorage.getItem(A.PHOTO_KEY)
    if (current) return JSON.parse(current)
    // Migrate photos saved before the StockEvo rename.
    const legacy = localStorage.getItem(LEGACY_PHOTO_KEY)
    if (legacy) {
      localStorage.setItem(A.PHOTO_KEY, legacy)
      localStorage.removeItem(LEGACY_PHOTO_KEY)
      return JSON.parse(legacy)
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  const [photos, setPhotos] = useState<Record<string, string>>(loadPhotos)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const ref = useRef(state)
  ref.current = state

  // Local-first: every change is committed to this device immediately (BR8).
  useEffect(() => {
    try {
      localStorage.setItem(A.STATE_KEY, JSON.stringify(state))
    } catch {
      /* storage full; state stays in memory */
    }
  }, [state])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const pending = A.pendingCount(state)

  useEffect(() => {
    if (!online || pending === 0) return
    const t = setTimeout(() => setState((s) => A.markSynced(s)), A.SYNC_DELAY_MS)
    return () => clearTimeout(t)
  }, [online, pending])

  const recordSale = useCallback<StoreApi['recordSale']>((lines) => {
    const check = A.recordSale(ref.current, lines)
    if (check.ok) setState((s) => A.recordSale(s, lines).state ?? s)
    return { ok: check.ok, message: check.message } as A.Result
  }, [])

  const createOrderList = useCallback<StoreApi['createOrderList']>((lines) => {
    const created = A.planOrders(ref.current, lines)
    setState((s) => A.addOrders(s, created))
    return created
  }, [])

  const addProduct = useCallback<StoreApi['addProduct']>((input) => {
    const product = A.createProduct(ref.current, input)
    setState((s) => A.addProduct(s, product))
    return product
  }, [])

  const setPhoto = useCallback<StoreApi['setPhoto']>(
    async (productId, dataUrl) => {
      const next = { ...photos, [productId]: dataUrl }
      try {
        localStorage.setItem(A.PHOTO_KEY, JSON.stringify(next))
      } catch {
        return { ok: false, message: A.PHOTO_FULL_MESSAGE }
      }
      setPhotos(next)
      return { ok: true, message: A.PHOTO_SAVED_MESSAGE }
    },
    [photos],
  )

  const removePhoto = useCallback((productId: string) => {
    setPhotos((prev) => {
      const next = { ...prev }
      delete next[productId]
      localStorage.setItem(A.PHOTO_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo<StoreApi>(
    () => ({
      state,
      photos,
      online,
      pending,
      recordSale,
      createOrderList,
      addProduct,
      receivePurchase: (id) => setState((s) => A.receivePurchase(s, id)),
      cancelPurchase: (id) => setState((s) => A.cancelPurchase(s, id)),
      upsertSupplierPrice: (input) => setState((s) => A.upsertSupplierPrice(s, input)),
      setPreferredSupplier: (productId, supplierId) => setState((s) => A.setPreferredSupplier(s, productId, supplierId)),
      setBudget: (n) => setState((s) => A.setBudget(s, n)),
      updateProfile: (p) => setState((s) => A.updateProfile(s, p)),
      setPhoto,
      removePhoto,
      resetDemoData: () => setState(createSeedState()),
    }),
    [state, photos, online, pending, recordSale, createOrderList, addProduct, setPhoto, removePhoto],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
