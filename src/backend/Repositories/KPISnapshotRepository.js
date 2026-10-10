class KPISnapshotRepository {
  constructor(database) {
    this.database = database; // expects an expo-sqlite database instance
  }

  async getSnapshotByProductId(productId) {
    return await this.database.getFirstAsync(
      `SELECT product_id AS productID, sales_velocity AS salesVelocity,
              days_of_stock_remaining AS daysOfStockRemaining,
              stockout_frequency AS stockoutFrequency,
              turnover_rate AS turnoverRate, computed_at AS computedAt
       FROM kpi_snapshots
       WHERE product_id = ?`,
      [productId],
    );
  }

  async getAllSnapshots() {
    return await this.database.getAllAsync(
      `SELECT product_id AS productID, sales_velocity AS salesVelocity,
              days_of_stock_remaining AS daysOfStockRemaining,
              stockout_frequency AS stockoutFrequency,
              turnover_rate AS turnoverRate, computed_at AS computedAt
       FROM kpi_snapshots`,
    );
  }
}

module.exports = KPISnapshotRepository;
