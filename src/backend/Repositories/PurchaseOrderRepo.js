import { db } from "../data/local/db";

// Restock orders ("PO-1001"). They live on this phone only: Supabase has no table for them yet,
// so nothing here is queued for sync. The stock an order adds or takes back is a normal stock
// movement, and that IS queued (through StockRepository).
class PurchaseOrderRepository {
  constructor(stockRepository) {
    this.stockRepository = stockRepository;
  }

  // Newest first; orders created together keep the order they were created in.
  async all() {
    const { rows: orders } = await db.execute(
      `select id, status, supplier_id, payment, created_at, received_at
       from purchase_orders order by created_at desc, rowid asc`,
    );
    const { rows: lines } = await db.execute(
      `select purchase_order_id, product_id, quantity, unit_price
       from purchase_order_lines order by rowid`,
    );
    return { orders, lines };
  }

  // Saves orders as they are. A delivered one also adds its stock, in the same transaction.
  async save(orders) {
    await db.transaction(async (tx) => {
      for (const order of orders) {
        const createdAt = new Date(order.at ?? Date.now()).toISOString();
        const receivedAt =
          order.status === "delivered"
            ? new Date(order.receivedAt ?? Date.now()).toISOString()
            : null;

        await tx.execute(
          `insert into purchase_orders
             (id, status, supplier_id, payment, regular_stock, created_at, updated_at, received_at)
           values (?, ?, ?, ?, 0, ?, ?, ?)`,
          [
            order.id,
            order.status,
            order.supplierId,
            order.payment ?? "Cash",
            createdAt,
            createdAt,
            receivedAt,
          ],
        );
        for (const line of order.lines) {
          await tx.execute(
            `insert into purchase_order_lines
               (id, purchase_order_id, product_id, supplier_id, quantity, unit_price, received_at)
             values (?, ?, ?, ?, ?, ?, ?)`,
            [
              crypto.randomUUID(),
              order.id,
              line.productId,
              order.supplierId,
              line.qty,
              line.unitPrice,
              receivedAt,
            ],
          );
          if (order.status === "delivered") {
            await this.stockRepository.applyStockChange(
              line.productId,
              line.qty,
              "restock",
              false,
              tx,
            );
          }
        }
      }
    });
  }

  // Marks an order delivered and adds its stock. Returns false if it was already delivered or cancelled.
  async receive(id, receivedAtMs = Date.now()) {
    let changed = false;
    await db.transaction(async (tx) => {
      const { rows } = await tx.execute(
        `select status from purchase_orders where id = ?`,
        [id],
      );
      if (rows.length === 0) throw new Error(`Order ${id} not found`);
      if (rows[0].status === "delivered" || rows[0].status === "cancelled")
        return;

      const now = new Date(receivedAtMs).toISOString();
      const { rows: lines } = await tx.execute(
        `select product_id, quantity from purchase_order_lines where purchase_order_id = ?`,
        [id],
      );
      for (const line of lines) {
        await this.stockRepository.applyStockChange(
          line.product_id,
          Number(line.quantity),
          "restock",
          false,
          tx,
        );
      }
      await tx.execute(
        `update purchase_orders set status = 'delivered', received_at = ?, updated_at = ? where id = ?`,
        [now, now, id],
      );
      await tx.execute(
        `update purchase_order_lines set received_at = ? where purchase_order_id = ?`,
        [now, id],
      );
      changed = true;
    });
    return changed;
  }

  // A delivered order cannot be cancelled (its stock is already in).
  async cancel(id) {
    const now = new Date().toISOString();
    await db.execute(
      `update purchase_orders set status = 'cancelled', updated_at = ?
       where id = ? and status != 'delivered'`,
      [now, id],
    );
  }

  // Undo for "Bought it": takes the stock a delivered order added back out, then deletes the order.
  // The stock may end up below zero, like a sale can leave it.
  async remove(ids) {
    await db.transaction(async (tx) => {
      for (const id of ids) {
        const { rows } = await tx.execute(
          `select status from purchase_orders where id = ?`,
          [id],
        );
        if (rows.length === 0) continue;
        if (rows[0].status === "delivered") {
          const { rows: lines } = await tx.execute(
            `select product_id, quantity from purchase_order_lines where purchase_order_id = ?`,
            [id],
          );
          for (const line of lines) {
            await this.stockRepository.applyStockChange(
              line.product_id,
              -Number(line.quantity),
              "restock_undo",
              false,
              tx,
            );
          }
        }
        await tx.execute(
          `delete from purchase_order_lines where purchase_order_id = ?`,
          [id],
        );
        await tx.execute(`delete from purchase_orders where id = ?`, [id]);
      }
    });
  }
}

export default PurchaseOrderRepository;
