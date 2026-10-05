class KPISnapshotRepository {
  constructor(database) {
    this.database = database; // expects an expo-sqlite database instance
  }

  async getSnapshotByProductId(productId) {
    return await this.database.getFirstAsync(
      `SELECT product_id, velocity, days_remaining, stockouts, turnover, calc_time
       FROM kpi_snapshots
       WHERE product_id = ?`,
      [productId]
    );
  }

  async getAllSnapshots() {
    return await this.database.getAllAsync(
      `SELECT product_id, velocity, days_remaining, stockouts, turnover, calc_time
       FROM kpi_snapshots`
    );
  }
}

module.exports = KPISnapshotRepository;