import { useCallback, useEffect, useRef, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../providers/AuthProvider'
import { addToDraft, emptyDraft, undoLast, type AddItem, type Draft } from './sellModel'

type Drafts = { drafts: Draft[]; activeId: string; nextN: number }

const keyFor = (owner: string) => `stockevo-drafts:${owner}`

function fresh(): Drafts {
  const first = emptyDraft(1)
  return { drafts: [first], activeId: first.id, nextN: 2 }
}

const isEmpty = (d: Draft | undefined) => !d || d.lines.length === 0

/**
 * The sale being rung up, plus any parked ones.
 *
 * Saved on the phone, per account, so closing the app doesn't lose a parked
 * sale — but never synced: these aren't sales yet. Only Charge turns one into
 * a real sale in the store.
 *
 * Every change is a functional update. Press-and-hold calls `add` from a timer,
 * and a version that read state from its closure would lose every add after
 * the first.
 *
 * There is never more than one empty sale: switching away from an empty one
 * drops it, so "+ New" can't pile up blank tabs.
 */
export function useDrafts() {
  const { session } = useAuth()
  const owner = session?.user?.id ?? null
  const [data, setData] = useState<Drafts | null>(null)
  const loadedFor = useRef<string | null>(null)

  // Load once per account
  useEffect(() => {
    if (!owner || loadedFor.current === owner) return
    loadedFor.current = owner
    let alive = true
    AsyncStorage.getItem(keyFor(owner))
      .then((raw) => {
        if (!alive) return
        const parsed = raw ? (JSON.parse(raw) as Drafts) : null
        // A saved state is only usable if its active sale still exists
        setData(parsed?.drafts?.some((d) => d.id === parsed.activeId) ? parsed : fresh())
      })
      .catch(() => alive && setData(fresh()))
    return () => {
      alive = false
    }
  }, [owner])

  // Save every change
  useEffect(() => {
    if (!owner || !data) return
    AsyncStorage.setItem(keyFor(owner), JSON.stringify(data)).catch(() => {
      // Losing a parked sale on a full disk is bad but not worth blocking the counter over
    })
  }, [owner, data])

  const mutateActive = useCallback((fn: (d: Draft) => Draft) => {
    setData((prev) =>
      prev ? { ...prev, drafts: prev.drafts.map((d) => (d.id === prev.activeId ? fn(d) : d)) } : prev,
    )
  }, [])

  const add = useCallback((item: AddItem, qty: number) => mutateActive((d) => addToDraft(d, item, qty)), [mutateActive])

  const undo = useCallback(() => mutateActive(undoLast), [mutateActive])

  /** Keeps the current sale as a tab and starts a new empty one. Does nothing to an empty sale. */
  const park = useCallback(() => {
    setData((prev) => {
      if (!prev || isEmpty(prev.drafts.find((d) => d.id === prev.activeId))) return prev
      const next = emptyDraft(prev.nextN)
      return { drafts: [...prev.drafts, next], activeId: next.id, nextN: prev.nextN + 1 }
    })
  }, [])

  const switchTo = useCallback((id: string) => {
    setData((prev) => {
      if (!prev || id === prev.activeId) return prev
      const leaving = prev.drafts.find((d) => d.id === prev.activeId)
      const drafts = isEmpty(leaving) ? prev.drafts.filter((d) => d.id !== prev.activeId) : prev.drafts
      return { ...prev, drafts, activeId: id }
    })
  }, [])

  /** After Charge: the paid sale's tab goes, and the next customer starts on a fresh one. Parked sales stay. */
  const finishActive = useCallback(() => {
    setData((prev) => {
      if (!prev) return prev
      const next = emptyDraft(prev.nextN)
      return {
        drafts: [...prev.drafts.filter((d) => d.id !== prev.activeId), next],
        activeId: next.id,
        nextN: prev.nextN + 1,
      }
    })
  }, [])

  const active = data?.drafts.find((d) => d.id === data.activeId) ?? null

  return { ready: !!data, drafts: data?.drafts ?? [], active, add, undo, park, switchTo, finishActive }
}
