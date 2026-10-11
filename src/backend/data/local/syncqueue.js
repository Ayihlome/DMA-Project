import { db } from "./db";
import { supabase } from "../../../lib/supabase";
import { logger } from "../../Logging/Logger";

// Every local change is written to sync_queue in the same transaction as the change itself
// (see the repositories). processSyncQueue() later replays those rows against Supabase, oldest
// first, so a parent row (a sale) always reaches the server before its children (line items).

const MAX_TRIES = 5;
// Postgres "unique_violation": the server already has this row, so the insert is as good as done.
const DUPLICATE_KEY = "23505";

// Tables that are written with an upsert, and the columns that identify a row on the server.
const CONFLICT_COLUMNS = {
  supplier_prices: "supplier_id,product_id",
};

let running = false;

export async function enqueueSync(entityType, entityID, operation, payload) {
  await db.execute(
    `insert into sync_queue (id, entity_type, entity_id, operation, payload_json, status, retry_count, created_at)
     values (?, ?, ?, ?, ?, 'pending', 0, ?)`,
    [
      crypto.randomUUID(),
      entityType,
      entityID,
      operation,
      JSON.stringify(payload),
      new Date().toISOString(),
    ],
  );
}

/** A failed fetch (offline, DNS, timeout) rather than an answer from the server. */
function isNetworkError(error) {
  return (
    !error?.code &&
    /network request failed|failed to fetch|network error|timed? ?out|offline/i.test(
      String(error?.message ?? error),
    )
  );
}

async function send(item, payload) {
  const table = supabase.from(item.entity_type);
  switch (item.operation) {
    case "insert":
      return table.insert(payload);
    case "upsert":
      return table.upsert(payload, {
        onConflict: CONFLICT_COLUMNS[item.entity_type],
      });
    case "update":
      return table.update(payload).eq("id", item.entity_id);
    case "delete":
      return table.delete().eq("id", item.entity_id);
    default:
      return { error: { message: `Unknown operation ${item.operation}` } };
  }
}

/**
 * Sends every pending row to Supabase. Safe to call as often as you like:
 *  - only one run happens at a time;
 *  - it does nothing while nobody is signed in, or when the signed-in account is not the one
 *    that owns this device's data (rows are filled in with the signed-in user's id on the server);
 *  - a network failure stops the run without counting against the row;
 *  - a row the server rejects is retried, and parked as 'failed' after MAX_TRIES.
 *
 * @param {{ ownerID?: string }} [options]
 * @returns {Promise<{ skipped?: string, sent: number, failed: number, stopped?: boolean }>}
 */
export async function processSyncQueue({ ownerID } = {}) {
  if (running) return { skipped: "busy", sent: 0, failed: 0 };
  running = true;

  try {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;
    if (!user) return { skipped: "signed-out", sent: 0, failed: 0 };
    if (ownerID && ownerID !== user.id) {
      return { skipped: "other-owner", sent: 0, failed: 0 };
    }

    const { rows: pendingItems } = await db.execute(
      `select * from sync_queue
       where status = 'pending'
       order by created_at asc, rowid asc`,
    );

    let sent = 0;
    let failed = 0;

    for (const item of pendingItems) {
      let error = null;
      try {
        ({ error } = await send(item, JSON.parse(item.payload_json)));
      } catch (thrown) {
        error = thrown;
      }

      const delivered =
        !error || (item.operation === "insert" && error.code === DUPLICATE_KEY);
      if (delivered) {
        await db.execute(
          `update sync_queue set status = 'synced', synced_at = ?, last_error = null where id = ?`,
          [new Date().toISOString(), item.id],
        );
        sent += 1;
        continue;
      }

      if (isNetworkError(error)) {
        logger.warn("sync", "offline, will retry", { error: error.message });
        return { sent, failed, stopped: true };
      }

      const tries = item.retry_count + 1;
      await db.execute(
        `update sync_queue set retry_count = ?, status = ?, last_error = ? where id = ?`,
        [
          tries,
          tries >= MAX_TRIES ? "failed" : "pending",
          String(error.message ?? error).slice(0, 500),
          item.id,
        ],
      );
      logger.error("sync", `${item.entity_type} ${item.operation} rejected`, {
        id: item.entity_id,
        tries,
        error: error.message ?? String(error),
      });
      failed += 1;
    }

    return { sent, failed };
  } finally {
    running = false;
  }
}

/** Rows parked as 'failed' go back in the queue (after a bug fix or a missing migration). */
export async function retryFailedSync() {
  await db.execute(
    `update sync_queue set status = 'pending', retry_count = 0 where status = 'failed'`,
  );
}

/** How much is waiting, for a "saved on this phone / backed up" indicator. */
export async function getSyncCounts() {
  const { rows } = await db.execute(
    `select status, count(*) as n from sync_queue group by status`,
  );
  const counts = { pending: 0, failed: 0, synced: 0 };
  for (const row of rows) counts[row.status] = Number(row.n);
  return counts;
}

/** When the last change was delivered, or null if nothing has been yet. */
export async function getLastSyncedAt() {
  const { rows } = await db.execute(
    `select max(synced_at) as at from sync_queue where status = 'synced'`,
  );
  return rows[0]?.at ?? null;
}
