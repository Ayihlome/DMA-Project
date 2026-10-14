import { db } from "../data/local/db";
import { enqueueSync, patchMeta } from "./productSql";

/** removeMenuItem({ id }) - soft remove: sellable=false, menu cleared. Row stays so old sales keep names. */
export async function removeMenuItem({ id }) {
  if (!id) throw new Error("removeMenuItem needs an id");
  const now = new Date().toISOString();
  let meta;

  await db.transaction(async (tx) => {
    meta = await patchMeta(tx, id, { sellable: false, menu: null });
    await tx.execute(`update products set meta = ?, updated_at = ? where id = ?`,
      [JSON.stringify(meta), now, id]);
  });

  await enqueueSync("products", id, "upsert", { id, meta: JSON.stringify(meta), updated_at: now });
  return { id };
}
