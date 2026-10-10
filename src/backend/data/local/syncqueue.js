import { db } from "./db.js";
import { createClient } from '@supabase/supabase-js';

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

export async function processSyncQueue() {
  const { rows: pendingItems } = await db.execute(
    `select * from sync_queue
    where status = 'pending'
    order by created_at asc`,
  );

  for (const item of pendingItems) {
    try {
      const payload = JSON.parse(item.payload_json);
      
      if (item.entity_type === "stock_movements") {
        const { error } = await supabase.from ("stock_movements").insert (
          {
            id: item.entity_id,
            product_id: payload.productid,
            delta: payload.delta,
            resulting_quantity: payload.resulting_quantity,
            reason: payload.reason,
            created_at: payload.created_at
          }
         );
        if (error) {
          throw error; 
          }
      } else if (item.operation === "insert") {
        const { error } = await supabase.from(item.entity_type).insert(payload);

        if (error) {
          throw error;
        }
      } else if (item.operation === "update") {
        const { error } = await supabase
          .from(item.entity_type)
          .update(payload)
          .eq("id", item.entity_id);

        if (error) {
          throw error;
        }
      } else if (item.operation === "delete") {
        const { error } = await supabase
          .from(item.entity_type)
          .delete()
          .eq("id", item.entity_id);

        if (error) {
          throw error;
        }
      }

      await db.execute(`update sync_queue set status = 'synced' where id = ?`, [
        item.id,
      ]);
    } catch (error) {
      console.error(
        `Failed to sync ${item.entity_type} ${item.entity_id}:`,
        error,
      );

      await db.execute(
        `update sync_queue
          set retry_count = retry_count + 1
          where id = ?`,
        [item.id],
      );
    }
  }
}
