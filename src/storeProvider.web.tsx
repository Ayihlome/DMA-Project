import type { ReactElement, ReactNode } from 'react'
import { StoreProvider as LocalStoreProvider } from './store'

type Props = { children: ReactNode; fallback: ReactNode; ownerId?: string | null }

/**
 * Web always uses the `local` store (browser storage + Supabase snapshot backup).
 *
 * Metro picks this file instead of storeProvider.tsx when it bundles for web, exactly as it
 * does for db.web.js and supabase.web.ts. Phones never load it, so the phone build keeps
 * choosing between `local` and `sqlite` through EXPO_PUBLIC_STORE as before.
 *
 * The SQLite store cannot run in a browser (src/backend/data/local/db.web.js throws on use),
 * and this file also keeps it, and the whole backend it imports, out of the web bundle.
 */
export const StoreProvider: (props: Props) => ReactElement | null = LocalStoreProvider