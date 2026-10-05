class SupplierPriceRepository {
  constructor(database) {
    this.database = database; // this expects an expo-sqlite database instance
  }

  async getPricesByProductId(productId) {
    return await this.database.getAllAsync(
      `SELECT
         sp.supplier_id,
         s.name AS supplier_name,
         sp.product_id,
         sp.unit_price,
         sp.min_order_qty
       FROM supplier_prices sp
       JOIN suppliers s ON sp.supplier_id = s.supplier_id
       WHERE sp.product_id = ?`,
      [productId]
    );
  }
}

module.exports = SupplierPriceRepository;