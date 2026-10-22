/**
 * Which one-time prompts an owner has answered, with no React or storage in it.
 *
 * A prompt is asked once: when the owner completes it ("done") or says "Not now"
 * ("dismissed"), it never comes back. Kept per owner on this device under
 * `stockevo-hints:<ownerId>` (see hints.ts); it is not part of the shop's
 * backup, so a new phone may ask each one once more.
 */
export type HintState = 'done' | 'dismissed'
export type Hints = Record<string, HintState>

export const hintsKey = (ownerId: string) => `stockevo-hints:${ownerId}`

/** What storage held, or nothing: a missing, broken or odd value counts as not asked. */
export function parseHints(raw: string | null): Hints {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    const out: Hints = {}
    for (const [k, v] of Object.entries(parsed)) if (v === 'done' || v === 'dismissed') out[k] = v
    return out
  } catch {
    return {}
  }
}

export const withHint = (h: Hints, key: string, state: HintState): Hints => ({ ...h, [key]: state })

export const answered = (h: Hints, key: string) => h[key] === 'done' || h[key] === 'dismissed'
