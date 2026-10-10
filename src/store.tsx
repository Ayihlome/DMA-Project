import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import NetInfo from '@react-native-community/netinfo'
import { actions as A, createSeedState, type AppState, type StoreApi } from './core'

const StoreContext = createContext<StoreApi | null>(null)

async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

/** Same API as the web store (../src/data/store.tsx); only persistence differs. */
export function StoreProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [photos, setPhotos] = useState<Record<string, string>>({})
  const [online, setOnline] = useState(true)
  const ref = useRef(state)
  ref.current = state
  const photosRef = useRef(photos)
  photosRef.current = photos

  // Hydrate from device storage before showing any screen.
  useEffect(() => {
    let alive = true
    Promise.all([load<unknown>(A.STATE_KEY), load<Record<string, string>>(A.PHOTO_KEY)]).then(([saved, savedPhotos]) => {
      if (!alive) return
      setState(A.isValidState(saved) ? saved : createSeedState())
      setPhotos(savedPhotos ?? {})
    })
    return () => {
      alive = false
    }
  }, [])

  // Local-first: every change is committed to this device (BR8).
  useEffect(() => {
    if (state) AsyncStorage.setItem(A.STATE_KEY, JSON.stringify(state)).catch(() => {})
  }, [state])

  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false)), [])

  const pending = state ? A.pendingCount(state) : 0

  useEffect(() => {
    if (!online || pending === 0) return
    const t = setTimeout(() => setState((s) => s && A.markSynced(s)), A.SYNC_DELAY_MS)
    return () => clearTimeout(t)
  }, [online, pending])

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => s && fn(s)), [])

  const recordSale = useCallback<StoreApi['recordSale']>(
    (lines) => {
      const check = A.recordSale(ref.current!, lines)
      if (check.ok) update((s) => A.recordSale(s, lines).state ?? s)
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
        recordSale,
        createOrderList,
        addProduct,
        receivePurchase: (id) => update((s) => A.receivePurchase(s, id)),
        cancelPurchase: (id) => update((s) => A.cancelPurchase(s, id)),
        upsertSupplierPrice: (input) => update((s) => A.upsertSupplierPrice(s, input)),
        setPreferredSupplier: (productId, supplierId) => update((s) => A.setPreferredSupplier(s, productId, supplierId)),
        setBudget: (n) => update((s) => A.setBudget(s, n)),
        updateProfile: (p) => update((s) => A.updateProfile(s, p)),
        setPhoto,
        removePhoto,
        resetDemoData: () => setState(createSeedState()),
      },
    [state, photos, online, pending, recordSale, createOrderList, addProduct, setPhoto, removePhoto, update],
  )

  if (!value) return <>{fallback}</>
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>')
  return ctx
}
