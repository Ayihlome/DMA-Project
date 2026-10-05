import { db } from "db.js";
// import sync queue

class StockRepository {
  async getStockByProductId(productID) {
    const { rows } = await db.execute(
      `select * from stock_items where product_id = ?`,
      [productID],
    );

    return rows[0] ?? null;
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

  async getStockoutEventCount(productID, window) {
    const since = new Date(
      Date.now() - window * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { rows } = await db.execute(
      `select count(*) as count from stock_movements
      where product_id = ? and resulting_quantity = 0 and created_at >= ?`,
      [productID, since],
    );

    return rows[0]?.count ?? 0;
  }

  async getAverageStockHeld(productID, window) {
    const since = new Date(
      Date.now() - window * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { rows } = await db.execute(
      `select avg(result_quantity) as avg_qty from stock_movements
          where product_id = ? and created_at >= ?`,
      [productID, since],
    );

    return rows[0]?.avg_qty ?? null;
  }
}

export default StockRepository;
