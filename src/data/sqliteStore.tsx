import type { ReactNode } from 'react'
import { StoreProvider as LocalStoreProvider } from '../store'

/**
 * Placeholder for the use-case-backed store (Track B). Until it exists, EXPO_PUBLIC_STORE=sqlite
 * falls back to the local store, so flipping the flag early changes nothing and breaks nothing.
 */
export function SqliteStoreProvider(props: { children: ReactNode; fallback: ReactNode; ownerId?: string | null }) {
  if (__DEV__) console.warn('EXPO_PUBLIC_STORE=sqlite: SQLite store not built yet, using the local store')
  return <LocalStoreProvider {...props} />
}