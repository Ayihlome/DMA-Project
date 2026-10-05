import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";
class SaleRepo {
  async recordSale({
    saleID,
    ownerID,
    timestamp,
    totalAmount,
    lineItems,
    deductions,
  }) {
    await db.transaction(async (tx) => {
      // 1. validate stock for each deduction
      for (const { productID, quantity } of deductions) {
        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );

        const current = rows[0]?.quantity_on_hand;
        if (current == null)
          throw new Error(`No stock row for product ${productID}`);
        if (current < quantity)
          throw new Error(`Insufficient stock for product ${productID}`);
      }

      const now = new Date().toISOString();

      // 2. record the sale - sync_status starts 'pending' the sync service, flips it to 'synced' once the queue entry below is replayed
      await tx.execute(
        `insert into sales (id, owner_id, "timestamp", total_amount, sync_status, updated_at)
            values (?, ?, ?, ?, 'pending', ?)`,
        [saleID, ownerID, timestamp, totalAmount, now],
      );

      await enqueueSync("sales", saleID, "insert", {
        ownerID,
        timestamp,
        totalAmount,
      });

      // 3. record every line item
      for (const item of lineItems) {
        const lineItemID = crypto.randomUUID();
        await tx.execute(
          `insert into sale_line_items (id, sale_id, product_id, quantity_sold, price_at_sale, owner_id, updated_at)
           values (?, ?, ?, ?, ?, ?, ?)`,
          [
            lineItemID,
            saleID,
            item.productID,
            item.quantitySold,
            item.priceAtSale,
            ownerID,
            now,
          ],
        );

        await enqueueSync("sale_line_items", lineItemID, "insert", {
          saleID,
          ...item,
          ownerID,
        });
      }

      // 4. apply stock deductions, log movements, queue deltas (see StockRepository
      //    for why these are deltas, not snapshots)
      for (const { productID, quantity } of deductions) {
        await tx.execute(
          `update stock_items set quantity_on_hand = quantity_on_hand - ?, updated_at = ? where product_id = ?`,
          [quantity, now, productID],
        );

        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );
        const resultingQty = rows[0].quantity_on_hand;

        await tx.execute(
          `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
           values (?, ?, ?, ?, 'sale_deduction', ?)`,
          [crypto.randomUUID(), productID, -quantity, resultingQty, now],
        );

        await enqueueSync("stock_items", productID, "update", {
          delta: -quantity,
        });
      }
    });
  }

  async getTotalQuantitySold(productID, window) {
    const since = new Date(
      Date.now() - window * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { rows } = await db.execute(
      `select coalesce(sum(sli.quantity_sold), 0) as total
        from sale_line_items sli
        join sales s on s.id = sli.sale_id
        where sli.product_id = ? and s."timestamp" >= ?`,
      [productID, since],
    );

    return rows[0]?.total ?? 0;
  }
}

export default SaleRepo;
