import type { ReactElement, ReactNode } from 'react'
import { StoreProvider as LocalStoreProvider } from './store'

type Props = { children: ReactNode; fallback: ReactNode; ownerId?: string | null }

/**
 * EXPO_PUBLIC_STORE picks where shop data lives:
 *   local  (default) AsyncStorage + Supabase snapshot backup, as v2 ships today
 *   sqlite           SQLite through the use cases (src/data/sqliteStore.tsx)
 *
 * Expo inlines EXPO_PUBLIC_* at bundle time, so with `local` the SQLite store (and the
 * backend it imports) is not bundled and cannot open a database.
 */
export const StoreProvider: (props: Props) => ReactElement | null =
  process.env.EXPO_PUBLIC_STORE === 'sqlite'
    ? require('./data/sqliteStore').SqliteStoreProvider
    : LocalStoreProvider