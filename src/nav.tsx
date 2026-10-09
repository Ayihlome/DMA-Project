import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { BackHandler } from 'react-native'

/** Mirrors the website routes: /, /sales, /supply?item=, /restock, /profile?history= */
export type Route =
  | { name: 'dashboard' }
  | { name: 'sales' }
  | { name: 'supply'; item?: string }
  | { name: 'restock' }
  | { name: 'profile'; history?: 'purchases' | 'sales' }

export type TabName = 'dashboard' | 'sales' | 'supply' | 'restock'
export const TABS: { name: TabName; icon: string; label: string; title: string }[] = [
  { name: 'dashboard', icon: 'dashboard', label: 'Dashboard', title: 'Dashboard' },
  { name: 'sales', icon: 'point_of_sale', label: 'Sales', title: 'Record Sale' },
  { name: 'supply', icon: 'storefront', label: 'Supply', title: 'Compare Prices' },
  { name: 'restock', icon: 'inventory_2', label: 'Restock', title: 'Restock Plan' },
]
export const titleOf = (r: Route) => TABS.find((t) => t.name === r.name)?.title ?? 'Profile'
export const isTab = (r: Route) => TABS.some((t) => t.name === r.name)

type Nav = {
  route: Route
  /** Changes on every navigation so screens remount and start at the top, like a page load. */
  key: number
  navigate: (r: Route, opts?: { replace?: boolean }) => void
  back: () => void
}

const NavContext = createContext<Nav | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<{ route: Route; key: number }[]>([{ route: { name: 'dashboard' }, key: 0 }])
  const top = stack[stack.length - 1]

  const navigate = useCallback<Nav['navigate']>((route, opts) => {
    setStack((s) => {
      const entry = { route, key: Date.now() }
      if (opts?.replace) return [...s.slice(0, -1), entry]
      // Tabs act as the root of the history; sub-pages (profile) push on top.
      return isTab(route) ? [entry] : [...s, entry]
    })
  }, [])

  const back = useCallback(() => {
    setStack((s) => (s.length > 1 ? s.slice(0, -1) : s[0].route.name !== 'dashboard' ? [{ route: { name: 'dashboard' }, key: Date.now() }] : s))
  }, [])

  // Android hardware back: leave sub-pages, then return to the dashboard, then exit.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1 || top.route.name !== 'dashboard') {
        back()
        return true
      }
      return false
    })
    return () => sub.remove()
  }, [stack.length, top.route.name, back])

  const value = useMemo(() => ({ route: top.route, key: top.key, navigate, back }), [top, navigate, back])
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

export function useNav() {
  const ctx = useContext(NavContext)
  if (!ctx) throw new Error('useNav must be used inside <NavProvider>')
  return ctx
}
