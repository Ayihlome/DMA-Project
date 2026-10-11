import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class SupplierPriceRepository {
  async getPricesByProductId(productId) {
    const { rows } = await db.execute(
      `select
         sp.supplier_id,
         s.name AS supplier_name,
         sp.product_id,
         sp.unit_price,
         sp.minimum_order as min_order_qty
       from supplier_prices sp
       join suppliers s ON sp.supplier_id = s.id
       where sp.product_id = ?`,
      [productId],
    );

    return rows;
  }

  async setSupplierPrice(price) {
    const now = new Date().toISOString();
    await db.execute(
      `insert into supplier_prices
       (id, supplier_id, product_id, unit_price, minimum_order, updated_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict(supplier_id, product_id) do update set
         unit_price = excluded.unit_price,
         minimum_order = excluded.minimum_order,
         updated_at = excluded.updated_at`,
      [
        price.id ?? crypto.randomUUID(),
        price.supplierID,
        price.productID,
        price.unitPrice,
        price.minimumOrder ?? null,
        now,
      ],
    );
    // A repeat price keeps the id of the first one, so read back the id that is actually stored.
    const { rows } = await db.execute(
      `select id from supplier_prices where supplier_id = ? and product_id = ?`,
      [price.supplierID, price.productID],
    );
    const id = rows[0].id;

    await enqueueSync("supplier_prices", id, "upsert", {
      id,
      supplier_id: price.supplierID,
      product_id: price.productID,
      unit_price: price.unitPrice,
      minimum_order: price.minimumOrder ?? null,
      updated_at: now,
    });

    return { ...price, id, updatedAt: now };
  }
}

export default SupplierPriceRepository;
