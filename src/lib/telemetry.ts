/**
 * Evaluation telemetry: sale timings and deduction-accuracy checks.
 *
 * Offline-first like the rest of the app. Events are buffered on the device and
 * flushed to Supabase when a send succeeds, so measurements taken in a shop
 * with no signal are not lost.
 *
 * Telemetry must never break the app. Every failure path here is swallowed, and
 * the Supabase client is imported lazily because it throws at module load when
 * .env has no credentials.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'

export type TelemetryType = 'sale_started' | 'sale_confirmed' | 'deduction_check'

type BufferedEvent = {
  type: TelemetryType
  data: Record<string, unknown>
  created_at: string
}

export const QUEUE_KEY = 'stockevo-telemetry-queue'
/** Older events are dropped first; the analysis only needs recent sessions. */
const MAX_QUEUED = 500

let flushing = false

async function readQueue(): Promise<BufferedEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY)
    return raw ? (JSON.parse(raw) as BufferedEvent[]) : []
  } catch {
    return []
  }
}

async function writeQueue(events: BufferedEvent[]) {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(events.slice(-MAX_QUEUED)))
  } catch {
    // Device storage full; dropping telemetry is preferable to failing a sale
  }
}

async function getClient() {
  try {
    const mod = await import('./supabase')
    return mod.supabase
  } catch {
    // No Supabase credentials configured; events stay buffered locally
    return null
  }
}

/** Fire-and-forget. Safe to call from a render-blocking path like confirming a sale. */
export function track(type: TelemetryType, data: Record<string, unknown> = {}) {
  void enqueue(type, data)
}

/** Correlates the events belonging to one sale. */
export function newSaleId() {
  return `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * Reading the clock lives here rather than in the screen: the React Compiler
 * treats Date.now() inside a component as an impure render-time call.
 */
export function trackSaleConfirmed(startedAt: number | null, data: Record<string, unknown>) {
  track('sale_confirmed', { ...data, duration_ms: startedAt === null ? null : Date.now() - startedAt })
}

async function enqueue(type: TelemetryType, data: Record<string, unknown>) {
  const queue = await readQueue()
  queue.push({ type, data, created_at: new Date().toISOString() })
  await writeQueue(queue)
  void flush()
}

/** Sends everything buffered. Events are only dropped from the queue once accepted. */
export async function flush() {
  if (flushing) return
  flushing = true
  try {
    const queue = await readQueue()
    if (!queue.length) return

    const supabase = await getClient()
    if (!supabase) return

    const { data: auth } = await supabase.auth.getUser()
    const ownerId = auth?.user?.id
    // Events are attributed to an owner by RLS, so there is nothing to send
    // until someone is signed in. They wait in the queue until then.
    if (!ownerId) return

    const { error } = await supabase
      .from('telemetry_events')
      .insert(queue.map((e) => ({ owner_id: ownerId, type: e.type, data: e.data, created_at: e.created_at })))

    if (error) return

    // Drop exactly what was sent; anything enqueued meanwhile is kept
    const latest = await readQueue()
    await writeQueue(latest.slice(queue.length))
  } catch {
    // Keep the queue intact and try again on the next event
  } finally {
    flushing = false
  }
}
