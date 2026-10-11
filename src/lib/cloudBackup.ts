/**
 * Cloud backup: one jsonb snapshot of the shop per owner, last write wins.
 *
 * This is a backup, not multi-device sync. It assumes one device per shop, so
 * there is no conflict resolution: the most recent upsert replaces the row.
 *
 * Device photos are never uploaded, and telemetry has its own table. The
 * simulated sync queue is stripped because it means nothing once restored.
 *
 * The Supabase client is imported lazily because it throws at module load when
 * .env has no credentials, and a missing backup must never stop the app working
 * offline.
 */
import { actions as A, type AppState } from '../core'

/** Matches AppState.version. A row written by a newer app is refused, not guessed at. */
export const SCHEMA_VERSION = 1

export type BackupStatus = 'idle' | 'pushing' | 'backed-up' | 'error'

async function getClient() {
  try {
    const mod = await import('./supabase')
    return mod.supabase
  } catch {
    return null
  }
}

/** Everything except the bookkeeping that is meaningless on another install. */
function snapshot(state: AppState) {
  const { queue: _queue, lastSyncedAt: _lastSyncedAt, ...rest } = state
  return rest
}

export async function pushBackup(state: AppState, ownerId: string): Promise<boolean> {
  try {
    const supabase = await getClient()
    if (!supabase) return false
    const { error } = await supabase
      .from('shop_backups')
      .upsert(
        { owner_id: ownerId, state: snapshot(state), schema_version: SCHEMA_VERSION },
        { onConflict: 'owner_id' },
      )
    return !error
  } catch {
    return false
  }
}

/**
 * The owner's snapshot, or null if there is none, the device is offline, or the
 * row was written by a version this build cannot read.
 */
export async function fetchBackup(): Promise<AppState | null> {
  try {
    const supabase = await getClient()
    if (!supabase) return null
    const { data, error } = await supabase
      .from('shop_backups')
      .select('state, schema_version')
      .maybeSingle()
    if (error || !data?.state) return null
    if (data.schema_version !== SCHEMA_VERSION) return null

    // Restored rows start with an empty queue; the old one described uploads
    // that already happened on another install.
    const restored = { ...(data.state as object), queue: [], lastSyncedAt: Date.now() }
    return A.isValidState(restored) ? restored : null
  } catch {
    return null
  }
}
