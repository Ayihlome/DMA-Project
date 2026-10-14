import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";
class SaleRepository {
  async recordSale({
    saleID,
    ownerID,
    timestamp,
    totalAmount,
    payment = null,
    cashGiven = null,
    allowNegative = false,
    lineItems,
    deductions,
    withoutRecipe = [],
  }) {
    const deductionTotals = new Map();
    for (const deduction of deductions) {
      deductionTotals.set(
        deduction.productID,
        (deductionTotals.get(deduction.productID) ?? 0) + deduction.quantity,
      );
    }
    const totalDeductions = [...deductionTotals].map(
      ([productID, quantity]) => ({ productID, quantity }),
    );

    const negativeStock = [];

    await db.transaction(async (tx) => {
      // 1. validate the combined requirement for each product
      for (const { productID, quantity } of totalDeductions) {
        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );

        const current = rows[0]?.quantity_on_hand;
        if (current == null)
          throw new Error(`No stock row for product ${productID}`);
        if (current < quantity && !allowNegative)
          throw new Error(`Insufficient stock for product ${productID}`);
      }

      const now = new Date().toISOString();

      // 2. record the sale - sync_status starts 'pending' the sync service, flips it to 'synced' once the queue entry below is replayed
      await tx.execute(
        `insert into sales (id, owner_id, "timestamp", total_amount, payment, cash_given, sync_status, updated_at)
               values (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [saleID, ownerID, timestamp, totalAmount, payment, cashGiven, now],
      );

      await enqueueSync("sales", saleID, "insert", {
        id: saleID,
        timestamp,
        total_amount: totalAmount,
        payment,
        cash_given: cashGiven,
        updated_at: now,
      });

      // 3. record every line item
      for (const item of lineItems) {
        const lineItemID = crypto.randomUUID();
        await tx.execute(
          `insert into sale_line_items (id, sale_id, product_id, label, quantity_sold, price_at_sale, owner_id, updated_at)
              values (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            lineItemID,
            saleID,
            item.productID ?? null,
            item.label ?? null,
            item.quantitySold,
            item.priceAtSale,
            ownerID,
            now,
          ],
        );

        await enqueueSync("sale_line_items", lineItemID, "insert", {
          id: lineItemID,
          sale_id: saleID,
          product_id: item.productID ?? null,
          label: item.label ?? null,
          quantity_sold: item.quantitySold,
          price_at_sale: item.priceAtSale,
          updated_at: now,
        });
      }

      // 4. apply stock deductions, log movements, queue deltas (see StockRepository
      //    for why these are deltas, not snapshots)
      for (const { productID, quantity } of totalDeductions) {
        await tx.execute(
          `update stock_items set quantity_on_hand = quantity_on_hand - ?, updated_at = ? where product_id = ?`,
          [quantity, now, productID],
        );

        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );
        const resultingQty = rows[0].quantity_on_hand;
        if (resultingQty < 0) negativeStock.push(productID);
        const movementID = crypto.randomUUID();

        await tx.execute(
          `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
           values (?, ?, ?, ?, 'sale_deduction', ?)`,
          [movementID, productID, -quantity, resultingQty, now],
        );

        await enqueueSync("stock_movements", movementID, "insert", {
          id: movementID,
          product_id: productID,
          delta: -quantity,
          reason: "sale_deduction",
          created_at: now,
        });
      }
      // 5. composites sold with no recipe deducted nothing: remember how many, until a count
      for (const [productID, quantity] of withoutRecipe) {
        await tx.execute(
          `update products set sold_without_recipe = sold_without_recipe + ? where id = ?`,
          [quantity, productID],
        );
      }
    });

    return { negativeStock };
  }
  async getSale(saleID) {
    const { rows } = await db.execute(`select * from sales where id = ?`, [
      saleID,
    ]);
    return rows[0] ?? null;
  }

  async getLineItems(saleID) {
    const { rows } = await db.execute(
      `select product_id, quantity_sold from sale_line_items where sale_id = ?`,
      [saleID],
    );
    return rows;
  }

  // Takes a sale back: marks it voided (it stays on file) and puts its stock back as movements.
  async voidSale({ saleID, deductions, withoutRecipe = [] }) {
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.execute(
        `update sales set voided_at = ?, updated_at = ? where id = ? and voided_at is null`,
        [now, now, saleID],
      );
      await enqueueSync("sales", saleID, "update", {
        voided_at: now,
        updated_at: now,
      });

      for (const { productID, quantity } of deductions) {
        await tx.execute(
          `update stock_items set quantity_on_hand = quantity_on_hand + ?, updated_at = ? where product_id = ?`,
          [quantity, now, productID],
        );
        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );
        const movementID = crypto.randomUUID();
        await tx.execute(
          `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
           values (?, ?, ?, ?, 'sale_void', ?)`,
          [movementID, productID, quantity, rows[0].quantity_on_hand, now],
        );
        await enqueueSync("stock_movements", movementID, "insert", {
          id: movementID,
          product_id: productID,
          delta: quantity,
          reason: "sale_void",
          created_at: now,
        });
      }

      for (const [productID, quantity] of withoutRecipe) {
        await tx.execute(
          `update products set sold_without_recipe = max(0, sold_without_recipe - ?) where id = ?`,
          [quantity, productID],
        );
      }
    });
  }

  async getSale(saleID) {
    const { rows } = await db.execute(`select * from sales where id = ?`, [
      saleID,
    ]);
    return rows[0] ?? null;
  }

  async getLineItems(saleID) {
    const { rows } = await db.execute(
      `select product_id, quantity_sold from sale_line_items where sale_id = ?`,
      [saleID],
    );
    return rows;
  }
  // Takes a sale back: marks it voided (it stays on file) and puts its stock back as movements.
  async voidSale({ saleID, deductions, withoutRecipe = [] }) {
    const now = new Date().toISOString();
    await db.transaction(async (tx) => {
      await tx.execute(
        `update sales set voided_at = ?, updated_at = ? where id = ? and voided_at is null`,
        [now, now, saleID],
      );
      await enqueueSync("sales", saleID, "update", {
        voided_at: now,
        updated_at: now,
      });

      for (const { productID, quantity } of deductions) {
        await tx.execute(
          `update stock_items set quantity_on_hand = quantity_on_hand + ?, updated_at = ? where product_id = ?`,
          [quantity, now, productID],
        );
        const { rows } = await tx.execute(
          `select quantity_on_hand from stock_items where product_id = ?`,
          [productID],
        );
        const movementID = crypto.randomUUID();
        await tx.execute(
          `insert into stock_movements (id, product_id, delta, resulting_quantity, reason, created_at)
           values (?, ?, ?, ?, 'sale_void', ?)`,
          [movementID, productID, quantity, rows[0].quantity_on_hand, now],
        );
        await enqueueSync("stock_movements", movementID, "insert", {
          id: movementID,
          product_id: productID,
          delta: quantity,
          reason: "sale_void",
          created_at: now,
        });
      }

      for (const [productID, quantity] of withoutRecipe) {
        await tx.execute(
          `update products set sold_without_recipe = max(0, sold_without_recipe - ?) where id = ?`,
          [quantity, productID],
        );
      }
    });
  }

  async getSalesTotal(from, to) {
    const { rows } = await db.execute(
      `select coalesce(sum(total_amount), 0) as total
       from sales
       where timestamp >= ? and timestamp < ? and voided_at is null`,
      [from, to],
    );
    return Number(rows[0]?.total) || 0;
  }

  async getTotalQuantitySold(productID, window) {
    const since = new Date(
      Date.now() - window * 24 * 60 * 60 * 1000,
    ).toISOString();
    const { rows } = await db.execute(
      `select coalesce(sum(sli.quantity_sold), 0) as total
        from sale_line_items sli
        join sales s on s.id = sli.sale_id
        where sli.product_id = ? and s."timestamp" >= ? and s.voided_at is null`,
      [productID, since],
    );

    return rows[0]?.total ?? 0;
  }
}

export default SaleRepository;
