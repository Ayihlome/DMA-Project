import { db } from "../data/local/db";
import { enqueueSync, insertProduct, insertRecipeLine } from "./productSql";

export async function applyStarterPacks({ products = [], recipes = {}, counts = {}, profile }) {
  const now = new Date().toISOString();
  const seeded = [];

  await db.transaction(async (tx) => {
    // 1. wipe demo data (children before parents)
    for (const table of [
      "purchase_order_lines", "purchase_orders",
      "sale_line_items", "sales",
      "supplier_prices", "suppliers",
      "stock_movements", "stock_items",
      "recipe_components", "products",
    ]) {
      await tx.execute(`delete from ${table}`);
    }

    // 2. insert the catalogue; composites get no stock row (derived from ingredients)
    for (const p of products) {
      await insertProduct(tx, p, now);

      if (!p.composite) {
        const qty = Math.max(0, Number(counts[p.id]) || 0);
        await tx.execute(
          `insert into stock_items (product_id, quantity_on_hand, updated_at) values (?, ?, ?)`,
          [p.id, qty, now],
        );
        if (qty > 0) {
          await tx.execute(
            `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
             values (?, ?, ?, ?, 'opening_stock', ?)`,
            [crypto.randomUUID(), p.id, qty, qty, now],
          );
        }
      }
      seeded.push(p.id);
    }

    // 3. recipes (only for products that were actually inserted)
    for (const [parentId, lines] of Object.entries(recipes)) {
      if (!seeded.includes(parentId)) continue;
      for (const l of lines) {
        if (l.qty > 0 && seeded.includes(l.productId)) {
          await insertRecipeLine(tx, parentId, l.productId, l.qty, now);
        }
      }
    }

    // 4. mark onboarded + save profile
    const setSetting = (key, value) =>
      tx.execute(
        `insert into device_settings (key, value, updated_at) values (?, ?, ?)
         on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
        [key, value, now],
      );
    await setSetting("onboardedAt", now);
    if (profile) await setSetting("profile", JSON.stringify(profile));
  });

  // Local reset: the old queue entries belong to wiped rows, so only queue the new catalogue
  for (const p of products) {
    await enqueueSync("products", p.id, "upsert", { id: p.id, name: p.name, updated_at: now });
  }
  return { products: seeded.length };
}