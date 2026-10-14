import { db } from "../data/local/db";
import {
  enqueueSync,
  insertProduct,
  insertRecipeLine,
  patchMeta,
  parseMeta,
  round2,
  toSyncProduct,
} from "./productSql";

/**
 * Creates or updates a sellable made-to-order product and replaces its recipe, atomically.
 *
 * Input:  { id?, name, price, menu, recipe: [{ productId, qty }] }
 * Output: { success: true, id, cost, recipeLines } | { success: false, errors: string[] }
 */
export async function saveMenuItem({
  id,
  name,
  price,
  menu,
  recipe = [],
} = {}) {
  if (!name?.trim())
    return { success: false, errors: ["Menu item needs a name"] };
  if (!(price >= 0))
    return { success: false, errors: ["Menu item needs a valid price"] };

  const productId = id ?? crypto.randomUUID();
  const now = new Date().toISOString();
  const menuName = menu || "Menu";

  try {
    // 1. Drop lines with qty 0 and lines whose ingredient does not exist
    const wanted = recipe.filter((l) => l.qty > 0);
    const ids = [...new Set(wanted.map((l) => l.productId))];
    let costs = new Map();
    if (ids.length) {
      const { rows } = await db.execute(
        `select id, meta from products where is_deleted = 0 and id in (${ids.map(() => "?").join(",")})`,
        ids,
      );
      costs = new Map(
        rows.map((r) => [r.id, Number(parseMeta(r.meta).cost) || 0]),
      );
    }
    const lines = wanted.filter((l) => costs.has(l.productId));

    // 2. Cost comes from ingredient costs
    const cost = round2(
      lines.reduce((s, l) => s + costs.get(l.productId) * l.qty, 0),
    );

    // 3. Create/update + replace the recipe + queue the sync rows, in ONE transaction.
    //    The product is queued before its recipe lines so Supabase sees it first.
    await db.transaction(async (tx) => {
      const { rows } = await tx.execute(
        `select id from products where id = ?`,
        [productId],
      );

      if (rows.length === 0) {
        const row = await insertProduct(
          tx,
          {
            id: productId,
            name: name.trim(),
            category: "hot",
            price,
            cost,
            unit: "each",
            unitPlural: "each",
            packSize: 1,
            packLabel: "made to order",
            sellable: true,
            composite: true,
            menu: menuName,
          },
          now,
        );
        await enqueueSync("products", productId, "insert", toSyncProduct(row));
      } else {
        const meta = await patchMeta(tx, productId, {
          cost,
          menu: menuName,
          sellable: true,
        });
        await tx.execute(
          `update products set name = ?, selling_price = ?, category = 'hot', is_composite = 1,
             meta = ?, is_deleted = 0, updated_at = ? where id = ?`,
          [name.trim(), price, JSON.stringify(meta), now, productId],
        );
        await enqueueSync("products", productId, "update", {
          name: name.trim(),
          selling_price: price,
          category: "hot",
          is_composite: true,
          meta,
          is_deleted: false,
          updated_at: now,
        });
      }

      // The old recipe lines are soft-deleted (and the deletion queued), like RecipeRepository does
      const { rows: old } = await tx.execute(
        `select id from recipe_components where parent_product_id = ? and is_deleted = 0`,
        [productId],
      );
      for (const o of old) {
        await tx.execute(
          `update recipe_components set is_deleted = 1, updated_at = ? where id = ?`,
          [now, o.id],
        );
        await enqueueSync("recipe_components", o.id, "update", {
          is_deleted: true,
          updated_at: now,
        });
      }
      for (const l of lines) {
        const lineId = await insertRecipeLine(
          tx,
          productId,
          l.productId,
          l.qty,
          now,
        );
        await enqueueSync("recipe_components", lineId, "insert", {
          id: lineId,
          parent_product_id: productId,
          component_product_id: l.productId,
          quantity_required: l.qty,
          updated_at: now,
          is_deleted: false,
        });
      }
    });

    return { success: true, id: productId, cost, recipeLines: lines.length };
  } catch (error) {
    return { success: false, errors: [error.message] };
  }
}
