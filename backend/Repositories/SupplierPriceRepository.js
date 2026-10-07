import { db } from "../data/local/db";

class SupplierPriceRepository {
  async getPricesByProductId(productId) {
    return await db.execute(
      `select
         sp.supplier_id,
         s.name AS supplier_name,
         sp.product_id,
         sp.unit_price,
         sp.minium_order
       from supplier_prices sp
       join suppliers s ON sp.supplier_id = s.supplier_id
       where sp.product_id = ?`,
      [productId],
    );
  }
}

module.exports = SupplierPriceRepository;
