import { db } from "../data/local/db";
import {
  enqueueSync,
  insertProduct,
  insertRecipeLine,
  toSyncProduct,
} from "./productSql";

/**
 * Replaces the demo catalogue with the starter packs picked in onboarding, and marks the
 * shop as onboarded. Everything happens in one transaction.
 *
 * - Local rows (products, stock, recipes, sales, orders, suppliers) are wiped first.
 * - Sync rows that were never sent belong to the wiped data, so they are dropped. Products
 *   that DID reach Supabase are soft-deleted there, so the demo shop does not come back.
 * - The new catalogue, its opening stock and its recipes are queued for sync.
 *
 * Input:  { products: Product[], recipes: { [parentId]: [{ productId, qty }] },
 *           counts: { [productId]: number }, profile?: Profile }
 * Output: { success: true, products: number } | { success: false, errors: string[] }
 */
export async function applyStarterPacks({
  products = [],
  recipes = {},
  counts = {},
  profile,
} = {}) {
  const now = new Date().toISOString();
  const nowMs = Date.parse(now);
  const seeded = [];

  try {
    await db.transaction(async (tx) => {
      // Products already on Supabase: they get soft-deleted there below
      const { rows: sent } = await tx.execute(
        `select distinct entity_id from sync_queue
         where entity_type = 'products' and status = 'synced'`,
      );

      // 1. wipe demo data (children before parents)
      for (const table of [
        "purchase_order_lines",
        "purchase_orders",
        "sale_line_items",
        "sales",
        "supplier_prices",
        "suppliers",
        "kpi_snapshots",
        "stock_movements",
        "stock_items",
        "recipe_components",
        "products",
      ]) {
        await tx.execute(`delete from ${table}`);
      }
      await tx.execute(`delete from sync_queue where status != 'synced'`);
      await tx.execute(`delete from device_settings where key = 'preferred'`);

      for (const { entity_id } of sent) {
        await enqueueSync("products", entity_id, "update", {
          is_deleted: true,
          updated_at: now,
        });
      }

      // 2. the catalogue; composites get no stock row (derived from ingredients)
      const movements = [];
      for (const p of products) {
        const row = await insertProduct(tx, p, now);
        await enqueueSync("products", p.id, "insert", toSyncProduct(row));

        if (!p.composite) {
          const qty = Math.max(0, Number(counts[p.id]) || 0);
          await tx.execute(
            `insert into stock_items (product_id, quantity_on_hand, updated_at) values (?, ?, ?)`,
            [p.id, qty, now],
          );
          if (qty > 0) {
            const movementID = crypto.randomUUID();
            await tx.execute(
              `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
               values (?, ?, ?, ?, 'opening_stock', ?)`,
              [movementID, p.id, qty, qty, now],
            );
            movements.push({ movementID, productID: p.id, qty });
          }
        }
        seeded.push(p.id);
      }

      // 3. recipes (only for products that were actually inserted)
      const recipeRows = [];
      for (const [parentId, lines] of Object.entries(recipes)) {
        if (!seeded.includes(parentId)) continue;
        for (const l of lines) {
          if (l.qty > 0 && seeded.includes(l.productId)) {
            const id = await insertRecipeLine(
              tx,
              parentId,
              l.productId,
              l.qty,
              now,
            );
            recipeRows.push({
              id,
              parentId,
              componentId: l.productId,
              qty: l.qty,
            });
          }
        }
      }

      // 4. queue the opening stock and the recipes (products are already queued, so they go first)
      for (const m of movements) {
        await enqueueSync("stock_movements", m.movementID, "insert", {
          id: m.movementID,
          product_id: m.productID,
          delta: m.qty,
          resulting_quantity: m.qty,
          reason: "opening_stock",
          created_at: now,
        });
      }
      for (const r of recipeRows) {
        await enqueueSync("recipe_components", r.id, "insert", {
          id: r.id,
          parent_product_id: r.parentId,
          component_product_id: r.componentId,
          quantity_required: r.qty,
          updated_at: now,
          is_deleted: false,
        });
      }

      // 5. mark onboarded + save profile (stored as JSON, which is how loadShop reads them)
      const setSetting = (key, value) =>
        tx.execute(
          `insert into device_settings (key, value, updated_at) values (?, ?, ?)
           on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
          [key, JSON.stringify(value), now],
        );
      await setSetting("onboardedAt", nowMs);
      if (profile) await setSetting("profile", profile);
    });

    return { success: true, products: seeded.length };
  } catch (error) {
    return { success: false, errors: [error.message] };
  }
}
