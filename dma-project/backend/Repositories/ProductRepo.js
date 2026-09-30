db = require("db");
enqueueSync = require("syncQueue.js");

class ProductRepo {
  async getByID(productID) {
    const { rows } = await db.execute(`select * from products where id = ?`, [
      productID,
    ]);
    return rows[0] ?? null;
  }

  async create() {
    const now = new Date().toISOString();
    await db.execute(
      `insert into product (id, name, sku, unit, is_composite, selling_price, created_at, updated_at, is_deleted) values (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        product.id,
        product.name,
        product.sku,
        product.unit,
        product.isComposite ? 1 : 0,
        product.sellingPrice,
        now,
        now,
      ],
    );

    await enqueueSync("products", product.id, "insert", product);
    return product;
  }

  async update(productID, changes) {
    const now = new Date().toISOString();
    const fields = Object.keys(changes);
    const setClause = fields.map((f) => `${f} = ?`).join(", ");

    await db.execute(
      `update products set ${setClause}, updated_at = ? where id = ?`,
      [...fields.map((f) => changes[f]), now, productID],
    );

    await enqueueSync("products", productID, "update", changes);
  }
}

export default ProductRepo;
