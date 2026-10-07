export async function createGenerateRestockPlanUseCase({
  restockEngine,
  KPISnapshotRepository,
  supplierPriceRepository,
}) {
  return async function generateRestockPlan(input) {
    const rawSnapshots = await KPISnapshotRepository.getAllSnapshots();

    const products = rawSnapshots.map((row) => ({
      product: { productId: row.productID },
      kpiSnapshot: row,
    }));

    const ranked = RestockEngine.rankByUrgency(products);

    const cart = [];
    const recommendations = [];

    for (const item of ranked) {
      if (item.urgency === "OK") {
        continue;
      }

      const rawPrices = await supplierPriceRepository.getPricesByProductId(
        item.product.productId,
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
        Math.ceil(item.kpiSnapshot.salesVelocity * daysToRestock),
      );

      const supplierResult = supplierPriceRepository.selectSupplier(
        supplierPrices,
        recommendedQty,
      );

      if (!supplierResult) {
        continue;
      }

      cart.push({
        productId: item.product.productId,
        unitPrice: supplierResult.cheapest.unitPrice,
        quantity: recommendedQty,
      });

      const recommendation = restockEngine.generateRecommendation(
        item.product,
        item.kpiSnapshot,
        supplierResult,
        recommendedQty,
        cart,
        input,
      );

      recommendations.push(recommendation);
    }

    return recommendations;
  };
}
