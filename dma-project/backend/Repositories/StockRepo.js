class StockRepository {
  constructor(database) {
    this.database = database;
  }

  getStockByProductId(productId) {
    return this.database
      .prepare(
        `
                SELECT
                    product_id,
                    quantity_on_hand
                FROM stock_items
                WHERE product_id = ?
            `,
      )
      .get(productId);
  }

  deductStock(productId, quantity) {
    return this.database
      .prepare(
        `
                UPDATE stock_items
                SET quantity_on_hand =
                    quantity_on_hand - ?
                WHERE product_id = ?
            `,
      )
      .run(quantity, productId);
  }

  getStockoutEventCount(productID, window) {}

  getAverageStockHeld(productID, window) {}
}

module.exports = StockRepository;
