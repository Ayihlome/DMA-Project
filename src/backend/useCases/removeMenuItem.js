import { db } from "../data/local/db";
import { enqueueSync, patchMeta } from "./productSql";

/**
 * Takes an item off the menu. Soft remove: sellable=false and the menu group cleared.
 * The row stays so old sales keep their names.
 *
 * Input:  { id: string }
 * Output: { success: true, id } | { success: false, errors: string[] }
 */
export async function removeMenuItem({ id } = {}) {
  if (!id) return { success: false, errors: ["removeMenuItem needs an id"] };
  const now = new Date().toISOString();

  try {
    await db.transaction(async (tx) => {
      const meta = await patchMeta(tx, id, { sellable: false, menu: null });
      await tx.execute(
        `update products set meta = ?, updated_at = ? where id = ?`,
        [JSON.stringify(meta), now, id],
      );
      // an update, not an upsert: Supabase would reject a partial row that has no name or unit
      await enqueueSync("products", id, "update", { meta, updated_at: now });
    });
    return { success: true, id };
  } catch (error) {
    return { success: false, errors: [error.message] };
  }
}
