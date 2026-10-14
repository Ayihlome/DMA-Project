import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class ProductRepository {
  async getByID(productID) {
    const { rows } = await db.execute(
      `select * from products where id = ? and is_deleted = 0`,
      [productID],
    );
    return rows[0] ?? null;
  }

  async getAll() {
    const { rows } = await db.execute(
      `select * from products where is_deleted = 0`,
    );
    return rows ?? null;
  }

  async create(product) {
    const now = new Date().toISOString();
    const openingStock = product.openingStock ?? 0;
    const isComposite = Boolean(product.is_composite);
    const movementID = crypto.randomUUID();
    await db.transaction(async (tx) => {
      await tx.execute(
        ` insert into products
           (id, name, sku, unit, is_composite, selling_price, category, pack_size, meta, created_at, updated_at, is_deleted)
           values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          product.id,
          product.name,
          product.sku ?? null,
          product.unit,
          isComposite ? 1 : 0,
          product.sellingPrice,
          product.category ?? null,
          product.packSize ?? 1,
          JSON.stringify(product.meta ?? {}),
          now,
          now,
        ],
      );
      await tx.execute(
        `insert into stock_items (product_id, quantity_on_hand, updated_at)
         values (?, ?, ?)`,
        [product.id, openingStock, now],
      );
      await tx.execute(
        `insert into stock_movements
         (id, product_id, delta, resulting_quantity, reason, created_at)
         values (?, ?, ?, ?, 'opening_stock', ?)`,
        [movementID, product.id, openingStock, openingStock, now],
      );
    });

    await enqueueSync("products", product.id, "insert", {
      id: product.id,
      name: product.name,
      sku: product.sku ?? null,
      unit: product.unit,
      is_composite: isComposite,
      selling_price: product.sellingPrice,
      category: product.category ?? null,
      pack_size: product.packSize ?? 1,
      meta: product.meta ?? {},
      created_at: now,
      updated_at: now,
      is_deleted: false,
    });
    await enqueueSync("stock_movements", movementID, "insert", {
      id: movementID,
      product_id: product.id,
      delta: openingStock,
      resulting_quantity: openingStock,
      reason: "opening_stock",
      created_at: now,
    });
    return product;
  }

  async update(productID, changes) {
    const now = new Date().toISOString();
    const fields = Object.keys(changes);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    // meta is an object for the app and the sync payload, JSON text in SQLite
    const toSql = (f) =>
      f === "meta" ? JSON.stringify(changes.meta ?? {}) : changes[f];

    await db.execute(
      `update products set ${setClause}, updated_at = ? where id = ?`,
      [...fields.map(toSql), now, productID],
    );

    await enqueueSync("products", productID, "update", changes);
  }

  // Phone-only counter (it has no column on Supabase), so nothing is queued.
  async setSoldWithoutRecipe(productID, count) {
    await db.execute(
      `update products set sold_without_recipe = ? where id = ?`,
      [count, productID],
    );
  }
}

export default ProductRepository;
