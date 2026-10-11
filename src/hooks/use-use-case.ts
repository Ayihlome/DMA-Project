import { useCallback, useEffect, useRef, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import { useAuth } from '../providers/AuthProvider'

export type UseCaseQuery<T> = { data: T | null; loading: boolean; error: string | null; reload: () => Promise<void> }

/**
 * Runs a read use case when the screen first shows and again every time the tab comes back
 * into view (a sale made on one tab must show on the others).
 *
 *   const { data } = useUseCase(() => useCases.getDashboardSummary({ ownerID }), [ownerID])
 *
 * Keeps the last answer while reloading and ignores an answer that arrives after a newer request.
 */
export function useUseCase<T>(load: () => Promise<T>, deps: readonly unknown[] = []): UseCaseQuery<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)

  const run = useCallback(async () => {
    const ticket = ++latest.current
    setLoading(true)
    try {
      const next = await load()
      if (ticket !== latest.current) return
      setData(next)
      setError(null)
    } catch (e) {
      if (ticket !== latest.current) return
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      if (ticket === latest.current) setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useFocusEffect(
    useCallback(() => {
      run()
    }, [run]),
  )

  // Stop a late answer from updating an unmounted screen.
  useEffect(() => () => void ++latest.current, [])

  return { data, loading, error, reload: run }
}

/** The signed-in shop owner. Sales are saved against this id. */
export function useOwnerId(): string {
  return useAuth().session?.user.id ?? ''
}
