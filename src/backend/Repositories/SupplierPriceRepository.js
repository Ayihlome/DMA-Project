import { db } from "../data/local/db";

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
    const id = price.id ?? crypto.randomUUID();
    await db.execute(
      `insert into supplier_prices
       (id, supplier_id, product_id, unit_price, minimum_order, updated_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict(supplier_id, product_id) do update set
         unit_price = excluded.unit_price,
         minimum_order = excluded.minimum_order,
         updated_at = excluded.updated_at`,
      [
        id,
        price.supplierID,
        price.productID,
        price.unitPrice,
        price.minimumOrder ?? null,
        now,
      ],
    );
    return { ...price, id, updatedAt: now };
  }
}

module.exports = SupplierPriceRepository;
