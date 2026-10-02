db = require("./db.js");

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
