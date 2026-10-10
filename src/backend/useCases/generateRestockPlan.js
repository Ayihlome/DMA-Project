export function createGenerateRestockPlanUseCase({
  restockEngine,
  kpiSnapshotRepository,
  supplierPriceRepository,
  productRepository,
  stockRepository,
}) {
  return async function generateRestockPlan(input) {
    const rawSnapshots = await kpiSnapshotRepository.getAllSnapshots();

    const products = (
      await Promise.all(
        rawSnapshots.map(async (row) => {
          const [product, stock] = await Promise.all([
            productRepository.getByID(row.productID),
            stockRepository.getStockByProductId(row.productID),
          ]);
          if (!product) return null;

          return {
            product: {
              id: product.id,
              productId: product.id,
              name: product.name,
              unit: product.unit,
              category: product.category,
              packSize: product.pack_size ?? 1,
              stock: stock?.quantityOnHand ?? 0,
            },
            kpiSnapshot: row,
          };
        }),
      )
    ).filter(Boolean);

    const ranked = restockEngine.rankByUrgency(products);

    const cart = [];
    const recommendations = [];
    const budget = Number(input?.budget ?? 0);

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
        minOrderQty: row.min_order_qty ?? row.minimum_order ?? 0,
      }));

      const supplierResult = restockEngine.selectSupplier(
        supplierPrices,
        Infinity,
      );

      if (!supplierResult) {
        continue;
      }

      const packSize = Math.max(0.01, Number(item.product.packSize) || 1);
      const stockOnHand = Number(item.product.stock) || 0;
      const dailyUsage = Number(item.kpiSnapshot.salesVelocity) || 0;
      const need = Math.max(packSize, 7 * dailyUsage - stockOnHand);
      const packs = Math.ceil(need / packSize - 1e-9);
      const recommendedQty = Math.max(
        Number(supplierResult.cheapest.minOrderQty) || 0,
        Math.round(packs * packSize * 100) / 100,
      );
      const candidate = {
        productId: item.product.productId,
        unitPrice: supplierResult.cheapest.unitPrice,
        quantity: recommendedQty,
      };
      const proposedCart = [...cart, candidate];
      const fitsBudget = restockEngine.checkBudget(proposedCart, budget);
      if (fitsBudget) cart.push(candidate);

      const recommendation = restockEngine.generateRecommendation(
        item.product,
        item.kpiSnapshot,
        supplierResult,
        recommendedQty,
        fitsBudget ? cart : proposedCart,
        budget,
      );

      recommendations.push(recommendation);
    }

    return {
      recommendations,
      budgetStatus: restockEngine.getBudgetStatus(cart, budget),
    };
  };
}
