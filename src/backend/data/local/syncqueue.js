import { db } from "./db";
import { supabase } from "../../../lib/supabase";

const MAX_TRIES = 5;
// Postgres "unique_violation": Supabase already has this row, so the insert is as good as done.
const DUPLICATE_KEY = "23505";
// Tables written with an upsert, and the columns that identify a row on the server.
const CONFLICT_COLUMNS = { supplier_prices: "supplier_id,product_id" };

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

// A failed fetch (no signal) rather than an answer from the server.
function isNetworkError(error) {
  return (
    !error?.code &&
    /network request failed|failed to fetch|network error|timed? ?out|offline/i.test(
      String(error?.message ?? error),
    )
  );
}

function send(item, payload) {
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

export async function processSyncQueue() {
  // One run at a time, so two timers can't send the same row twice.
  if (running) return;
  running = true;

  try {
    // Signed out: Supabase would reject every row and use up its retries.
    const { data } = await supabase.auth.getSession();
    if (!data?.session) return;

    const { rows: pendingItems } = await db.execute(
      `select * from sync_queue
       where status = 'pending'
       order by created_at asc, rowid asc`,
    );

    const missingTables = new Set();
    for (const item of pendingItems) {
      if (missingTables.has(item.entity_type)) continue;

      let error = null;
      try {
        ({ error } = await send(item, JSON.parse(item.payload_json)));
      } catch (thrown) {
        error = thrown;
      }

      if (
        !error ||
        (item.operation === "insert" && error.code === DUPLICATE_KEY)
      ) {
        await db.execute(
          `update sync_queue set status = 'synced' where id = ?`,
          [item.id],
        );
        continue;
      }

      if (MISSING_TABLE.includes(error?.code)) {
        missingTables.add(item.entity_type);
        console.warn(
          `Supabase has no "${item.entity_type}" table yet. Run its migration; those rows stay queued.`,
        );
        continue;
      }

      // No signal: stop here and try again later. This is not the row's fault.
      if (isNetworkError(error)) return;

      console.error(
        `Failed to sync ${item.entity_type} ${item.entity_id}:`,
        error,
      );
      const tries = item.retry_count + 1;
      await db.execute(
        `update sync_queue set retry_count = ?, status = ? where id = ?`,
        [tries, tries >= MAX_TRIES ? "failed" : "pending", item.id],
      );
    }
  } finally {
    running = false;
  }
}

// Gives rows that were parked as failed another go.
export async function retryFailedSync() {
  await db.execute(
    `update sync_queue set status = 'pending', retry_count = 0 where status = 'failed'`,
  );
}
