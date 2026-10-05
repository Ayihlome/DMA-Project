import { db } from "../data/local/db";

class KPISnapshotRepo {
  // the snapshot is saved locally on device
  async save(snapshot) {
    await db.execute(
      `insert into kpi_snapshots (id, product_id, sales_velocity, days_of_stock_remaining, stockout_frequency, turnover_rate, computed_at)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(product_id) do update set
         sales_velocity = excluded.sales_velocity,
         days_of_stock_remaining = excluded.days_of_stock_remaining,
         stockout_frequency = excluded.stockout_frequency,
         turnover_rate = excluded.turnover_rate,
         computed_at = excluded.computed_at`,
      [
        crypto.randomUUID(),
        snapshot.productID,
        snapshot.salesVelocity,
        snapshot.daysOfStockRemaining,
        snapshot.stockoutFrequency,
        snapshot.turnoverRate,
        snapshot.computedAt,
      ],
    );
  }
}

export default KPISnapshotRepo;
