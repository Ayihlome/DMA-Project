import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class StockRepository {
  async getStockByProductId(productID) {
    const { rows } = await db.execute(
      `select product_id as productID, quantity_on_hand as quantityOnHand
       from stock_items where product_id = ?`,
      [productID],
    );

    return rows[0] ?? null;
  }

  deductStock(productId, quantity) {
    return db.execute(
      `
                UPDATE stock_items
                SET quantity_on_hand =
                    quantity_on_hand - ?
                WHERE product_id = ?
            `,
      [quantity, productId],
    );
  }

  async getTotalDeducted(productID, windowDays) {
    const since = new Date(
      Date.now() - windowDays * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { rows } = await db.execute(
      `select coalesce(sum(-delta), 0) as total
       from stock_movements
       where product_id = ? and reason = 'sale_deduction' and delta < 0 and created_at >= ?`,
      [productID, since],
    );
    return rows[0]?.total ?? 0;
  }

  async receiveStock(productID, quantity) {
    if (quantity <= 0) throw new Error("Received quantity must be positive");
    return this.applyStockChange(productID, quantity, "restock");
  }

  async setOpeningStock(productID, quantity) {
    if (quantity < 0) throw new Error("Opening stock cannot be negative");
    return this.applyStockChange(productID, quantity, "opening_stock", true);
  }

  async applyStockChange(productID, amount, reason, setAbsolute = false) {
    const now = new Date().toISOString();
    const movementID = crypto.randomUUID();
    let resultingQuantity;
    let delta;

    await db.transaction(async (tx) => {
      const { rows } = await tx.execute(
        `select quantity_on_hand from stock_items where product_id = ?`,
        [productID],
      );
      const current = rows[0]?.quantity_on_hand ?? 0;
      resultingQuantity = setAbsolute ? amount : current + amount;
      delta = resultingQuantity - current;

      if (rows.length === 0) {
        await tx.execute(
          `insert into stock_items (product_id, quantity_on_hand, updated_at)
           values (?, ?, ?)`,
          [productID, resultingQuantity, now],
        );
      } else {
        await tx.execute(
          `update stock_items set quantity_on_hand = ?, last_restocked_at = ?, updated_at = ?
           where product_id = ?`,
          [
            resultingQuantity,
            reason === "restock" ? now : null,
            now,
            productID,
          ],
        );
      }

      if (delta !== 0) {
        await tx.execute(
          `insert into stock_movements
           (id, product_id, delta, resulting_quantity, reason, created_at)
           values (?, ?, ?, ?, ?, ?)`,
          [movementID, productID, delta, resultingQuantity, reason, now],
        );
      }
    });

    if (delta !== 0) {
      await enqueueSync("stock_movements", movementID, "insert", {
        id: movementID,
        product_id: productID,
        delta,
        resulting_quantity: resultingQuantity,
        reason,
        created_at: now,
      });
    }
    return { productID, quantityOnHand: resultingQuantity };
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
      `select avg(resulting_quantity) as avg_qty from stock_movements
          where product_id = ? and created_at >= ?`,
      [productID, since],
    );

    return rows[0]?.avg_qty ?? null;
  }
}

export default StockRepository;
