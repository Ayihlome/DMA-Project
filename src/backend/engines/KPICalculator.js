class KPISnapshot {
  constructor(
    productID,
    salesVelocity,
    daysOfStockRemaining,
    stockoutFrequency,
    turnoverRate,
    computedAt,
  ) {
    this.productID = productID;
    this.salesVelocity = salesVelocity;
    this.daysOfStockRemaining = daysOfStockRemaining;
    this.stockoutFrequency = stockoutFrequency;
    this.turnoverRate = turnoverRate;
    this.computedAt = computedAt;
  }
}

class KPICalculator {
  constructor(saleRepo, stockRepo, KPISnapshotRepo, windowDays = 30) {
    this.salesRepository = saleRepo;
    this.stockRepository = stockRepo;
    this.kpiSnapshotRepository = KPISnapshotRepo;
    this.windowDays = windowDays;
  }

  async calcSalesVelocity(productID) {
    // total units sold in the rolling window / window length = units per day
    const totalDeducted = await this.stockRepository.getTotalDeducted(
      productID,
      this.windowDays,
    );
    return totalDeducted / this.windowDays;
  }

  async calcDaysRemaining(productID) {
    const stockItem = await this.stockRepository.getStockByProductId(productID);
    if (!stockItem) return null;

    const velocity = await this.calcSalesVelocity(productID);
    if (velocity <= 0) {
      // no recent sale was made so no depletion date can be calculated
      return null;
    }

    return stockItem.quantityOnHand / velocity;
  }

  async calcStockoutFrequency(productID) {
    // requires a history of stockout to compare to, something like a stock movement table
    const stockoutEvents = await this.stockRepository.getStockoutEventCount(
      productID,
      this.windowDays,
    );
    return stockoutEvents / this.windowDays;
  }

  async calcTurnoverRate(productID) {
    const totalDeducted = await this.stockRepository.getTotalDeducted(
      productID,
      this.windowDays,
    );
    const avgStockHeld = await this.stockRepository.getAverageStockHeld(
      productID,
      this.windowDays,
    );

    if (!avgStockHeld) return null;
    return totalDeducted / avgStockHeld;
  }

  async generateSnapshot(productID) {
    const snapshot = new KPISnapshot(
      productID,
      await this.calcSalesVelocity(productID),
      await this.calcDaysRemaining(productID),
      await this.calcStockoutFrequency(productID),
      await this.calcTurnoverRate(productID),
      new Date().toISOString(),
    );

    await this.kpiSnapshotRepository.save(snapshot);
    return snapshot;
  }
}

export default KPICalculator;
