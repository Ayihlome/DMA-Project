class RestockRecommendation {
  constructor(product, urgency, quantity, supplier, status, explanation) {
    this.product = product;
    this.urgency = urgency;
    this.quantity = quantity;
    this.supplier = supplier;
    this.status = status;
    this.explanation = explanation;
  }
}

// Rounds to 2 decimal places.
function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

class RestockEngine {
  constructor(kpiSnapshotRepository, supplierPriceRepository) {
    this.kpiSnapshotRepository = kpiSnapshotRepository;
    this.supplierPriceRepository = supplierPriceRepository;
  }

  calcUrgency(kpiSnapshot) {
    const daysRemaining = kpiSnapshot.daysRemaining;

    if (daysRemaining <= 3) {
      return "Critical";
    } else if (daysRemaining <= 7) {
      return "Low Stock";
    } else {
      return "OK";
    }
  }

  rankByUrgency(products) {
    const urgencyOrder = { "Critical": 0, "Low Stock": 1, "OK": 2 };

    const ranked = products.map((product) => ({
      product: product.product,
      kpiSnapshot: product.kpiSnapshot,
      urgency: this.calcUrgency(product.kpiSnapshot),
    }));

    ranked.sort((a, b) => {
      const tierDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (tierDiff !== 0) return tierDiff;
      return a.kpiSnapshot.daysRemaining - b.kpiSnapshot.daysRemaining;
    });

    return ranked;
  }

  selectSupplier(supplierPrices, requiredQuantity = 0) {
    if (!supplierPrices || supplierPrices.length === 0) {
      return null;
    }

    const eligible = supplierPrices.filter(
      (s) => !s.minOrderQty || s.minOrderQty <= requiredQuantity
    );

    if (eligible.length === 0) {
      return null;
    }

    const sorted = [...eligible].sort((a, b) => a.unitPrice - b.unitPrice);
    const cheapest = sorted[0];

    const comparisons = sorted.map((s) => ({
      supplier: s,
      priceDifference: roundCurrency(s.unitPrice - cheapest.unitPrice),
      isCheapest: s === cheapest,
    }));

    return {
      cheapest,
      comparisons,
    };
  }

  checkBudget(cart, limit) {
    const total = cart.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    return roundCurrency(total) <= roundCurrency(limit);
  }

  getBudgetStatus(cart, limit) {
    const spent = roundCurrency(
      cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    );
    const remaining = roundCurrency(limit - spent);
    const percentUsed = limit > 0 ? roundCurrency((spent / limit) * 100) : 0;

    return {
      spent,
      remaining,
      percentUsed,
      withinBudget: spent <= roundCurrency(limit),
    };
  }

  generateRecommendation(
    product,
    kpiSnapshot,
    supplierResult,
    recommendedQty,
    cart,
    budgetLimit
  ) {
    const urgency = this.calcUrgency(kpiSnapshot);
    const { cheapest, comparisons } = supplierResult;

    const explanationParts = [];

    explanationParts.push(
      `${kpiSnapshot.daysRemaining} day(s) of stock remaining.`
    );

    const nextCheapest = comparisons.find((c) => !c.isCheapest);
    if (nextCheapest) {
      explanationParts.push(
        `${cheapest.supplierName} is R${nextCheapest.priceDifference.toFixed(2)} cheaper per unit than ${nextCheapest.supplier.supplierName}.`
      );
    }

    const budgetStatus = this.getBudgetStatus(cart, budgetLimit);
    explanationParts.push(
      budgetStatus.withinBudget
        ? `Fits within your available restocking budget.`
        : `Warning: this exceeds your available restocking budget.`
    );

    const explanation = explanationParts.join(" ");

    return new RestockRecommendation(
      product,
      urgency,
      recommendedQty,
      cheapest,
      budgetStatus.withinBudget ? "pending" : "over-budget",
      explanation
    );
  }

  async generateRestockPlan(budget) {
    const rawSnapshots = await this.kpiSnapshotRepository.getAllSnapshots();

    const products = rawSnapshots.map((row) => ({
      product: { productId: row.product_id },
      kpiSnapshot: {
        daysRemaining: row.days_remaining,
        salesVelocity: row.velocity,
        stockouts: row.stockouts,
        turnover: row.turnover,
      },
    }));

    const ranked = this.rankByUrgency(products);

    const cart = [];
    const recommendations = [];

    for (const item of ranked) {
      if (item.urgency === "OK") {
        continue;
      }

      const rawPrices = await this.supplierPriceRepository.getPricesByProductId(
        item.product.productId
      );

      const supplierPrices = rawPrices.map((row) => ({
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        unitPrice: row.unit_price,
        minOrderQty: row.min_order_qty,
      }));

      const daysToRestock = 7; // restock enough to cover a week of expected sales
      const recommendedQty = Math.max(
        1,
        Math.ceil(item.kpiSnapshot.salesVelocity * daysToRestock)
      );

      const supplierResult = this.selectSupplier(supplierPrices, recommendedQty);

      if (!supplierResult) {
        continue;
      }

      cart.push({
        productId: item.product.productId,
        unitPrice: supplierResult.cheapest.unitPrice,
        quantity: recommendedQty,
      });

      const recommendation = this.generateRecommendation(
        item.product,
        item.kpiSnapshot,
        supplierResult,
        recommendedQty,
        cart,
        budget
      );

      recommendations.push(recommendation);
    }

    return recommendations;
  }
}

module.exports = RestockEngine;