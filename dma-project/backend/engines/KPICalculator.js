class KPISnapshot {
  constructor(
    productID,
    velocity,
    days_left,
    stockoutFreq,
    turnover,
    calc_time,
  ) {
    this.productID = productID;
    this.salesVelocity = velocity;
    this.daysOfRemainingStock = days_left;
    this.stockoutFreq = stockoutFreq;
    this.turnoverRate = turnover;
    this.calc_time = calc_time;
  }
}

class KPICalculator {
  constructor(saleRepo, stockRepo, KPISnapshotRepo, windowDays = 30) {
    this.salesRepository = saleRepo;
    this.stockRepository = stockRepo;
    this.KPISnapshotRepository = KPISnapshotRepo;
    this.windowDays = windowDays;
  }

  calcSalesVelocity(productID) {
    // total units sold in the rolling window / window length = units per day
    const totalSold = this.salesRepository.getTotalQuantitySold(
      productID,
      this.windowDays,
    );
    return totalSold / this.windowDays;
  }

  calcDaysRemaining(productID) {
    const stockItem = this.stockRepository.getStockByProductID(productID);
    if (!stockItem) return null;

    const velocity = this.calcSalesVelocity(productID);
    if (velocity <= 0) {
      // no recent sale was made so no depletion date can be calculated
      return null;
    }

    return stockItem.quantityOnHand / velocity;
  }

  calcStockoutFrequency(productID) {
    // requires a history of stockout to compare to, something like a stock movement table
    const stockoutEvents = this.stockRepository.getStockoutEventCount(
      productID,
      this.windowDays,
    );
    return stockoutEvents / this.windowDays;
  }

  calcTurnoverRate(productID) {
    const totalSold = this.salesRepository.getTotalQuantitySold(
      productID,
      this.windowDays,
    );
    const avgStockHeld = this.stockRepository.getAverageStockHeld(
      productID,
      this.windowDays,
    );

    if (!avgStockHeld) return null;
    return totalSold / avgStockHeld;
  }

  generateSnapshot(productID) {
    const snapshot = new KPISnapshot(
      productID,
      this.calcSalesVelocity(productID),
      this.calcDaysRemaining(productID),
      this.calcStockoutFrequency(productID),
      this.calcTurnoverRate(productID),
      new Date().toISOString(),
    );

    this.KPISnapshotRepository.save(snapshot);
    return snapshot;
  }
}
