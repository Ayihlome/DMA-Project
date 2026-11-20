import { useCallback, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../providers/AuthProvider'
import { answered, hintsKey, parseHints, withHint, type Hints, type HintState } from './hintsModel'

/**
 * The signed-in owner's answered prompts, from this device's storage. Storage
 * failing never breaks a screen: a read that fails asks again, a write that
 * fails is simply not remembered.
 */
export function useHints() {
  const { session } = useAuth()
  const ownerId = session?.user?.id ?? null
  // Whose prompts these are: nothing is asked until this owner's have been read,
  // so a prompt already dismissed never flashes up
  const [loaded, setLoaded] = useState<{ owner: string; hints: Hints } | null>(null)

  useEffect(() => {
    if (!ownerId) return
    let alive = true
    AsyncStorage.getItem(hintsKey(ownerId))
      .then((raw) => parseHints(raw))
      .catch(() => ({}))
      .then((hints) => {
        if (alive) setLoaded({ owner: ownerId, hints })
      })
    return () => {
      alive = false
    }
  }, [ownerId])

  const ready = !!ownerId && loaded?.owner === ownerId
  const hints = ready ? loaded!.hints : {}

  const mark = useCallback(
    (key: string, state: HintState) => {
      if (!ownerId) return
      setLoaded((l) => {
        const next = withHint(l?.owner === ownerId ? l.hints : {}, key, state)
        AsyncStorage.setItem(hintsKey(ownerId), JSON.stringify(next)).catch(() => {})
        return { owner: ownerId, hints: next }
      })
    },
    [ownerId],
  )

  return { ready, hints, isAnswered: (key: string) => answered(hints, key), mark }
}
