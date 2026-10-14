import { db } from "../data/local/db";
import {
  enqueueSync, insertProduct, insertRecipeLine, patchMeta, parseMeta, round2,
} from "./productSql";

/**
 * saveMenuItem({ id?, name, price, menu, recipe: [{ productId, qty }] })
 * Creates or updates a sellable composite product and replaces its recipe, atomically.
 */
export async function saveMenuItem({ id, name, price, menu, recipe = [] }) {
  if (!name?.trim()) throw new Error("Menu item needs a name");
  if (!(price >= 0)) throw new Error("Menu item needs a valid price");

  const productId = id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const menuName = menu || "Menu";

  // 1. Drop lines with qty 0 and lines whose ingredient does not exist
  const wanted = recipe.filter((l) => l.qty > 0);
  const ids = [...new Set(wanted.map((l) => l.productId))];
  let costs = new Map();
  if (ids.length) {
    const { rows } = await db.execute(
      `select id, meta from products where is_deleted = 0 and id in (${ids.map(() => "?").join(",")})`,
      ids,
    );
    costs = new Map(rows.map((r) => [r.id, Number(parseMeta(r.meta).cost) || 0]));
  }
  const lines = wanted.filter((l) => costs.has(l.productId));

  // 2. Cost comes from ingredient costs
  const cost = round2(lines.reduce((s, l) => s + costs.get(l.productId) * l.qty, 0));
  const lineRows = [];

  // 3. Create/update + replace recipe in ONE transaction
  await db.transaction(async (tx) => {
    const { rows } = await tx.execute(`select id from products where id = ?`, [productId]);

    if (rows.length === 0) {
      await insertProduct(
        tx,
        { id: productId, name: name.trim(), category: "hot", price, cost,
          unit: "each", unitPlural: "each", packSize: 1, packLabel: "made to order",
          sellable: true, composite: true, menu: menuName },
        now,
      );
    } else {
      const meta = await patchMeta(tx, productId, { cost, menu: menuName, sellable: true });
      await tx.execute(
        `update products set name = ?, selling_price = ?, category = 'hot', is_composite = 1,
           meta = ?, is_deleted = 0, updated_at = ? where id = ?`,
        [name.trim(), price, JSON.stringify(meta), now, productId],
      );
    }

    await tx.execute(`delete from recipe_components where parent_product_id = ?`, [productId]);
    for (const l of lines) {
      const lineId = await insertRecipeLine(tx, productId, l.productId, l.qty, now);
      lineRows.push({ id: lineId, parent_product_id: productId,
        component_product_id: l.productId, quantity_required: l.qty, updated_at: now });
    }
  });

  await enqueueSync("products", productId, "upsert", {
    id: productId, name: name.trim(), selling_price: price, category: "hot",
    is_composite: 1, updated_at: now,
    meta: JSON.stringify({ cost, menu: menuName, sellable: true }),
  });
  for (const r of lineRows) await enqueueSync("recipe_components", r.id, "upsert", r);

  return { id: productId, cost, recipeLines: lines.length };
}
