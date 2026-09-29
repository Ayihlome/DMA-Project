class KPISnapshot {
  constructor(velocity, days_left, stockouts, turnover, calc_time) {
    this.salesVelocity = velocity;
    this.daysRemaining = days_left;
    this.stockouts = stockouts;
    this.turnover = turnover;
    this.calc_time = calc_time;
  }
}

class KPICalculator {}
