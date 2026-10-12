/**
 * A stock count: sets the quantity on hand for the products the owner counted.
 *
 * Input:  { counts: { [productID]: number } }
 * Output (success): { success: true, updated: StockItem[], skipped: { productID, reason }[] }
 * Output (failure): { success: false, errors: string[] }
 *
 * Made-to-order (composite) products are skipped, their stock comes from their ingredients.
 * A count never goes below 0. Saving a count also clears every "sold without a recipe" flag,
 * because that is what puts the ingredient numbers right again.
 */
export function createSetStockCountsUseCase({
  productRepository,
  stockRepository,
}) {
  return async function setStockCounts(input) {
    const counts = input?.counts;

    if (
      typeof counts !== "object" ||
      counts === null ||
      Array.isArray(counts)
    ) {
      return {
        success: false,
        errors: ["counts must be an object of productId: quantity"],
      };
    }

    try {
      const products = (await productRepository.getAll()) ?? [];
      const byId = new Map(products.map((p) => [p.id, p]));
      const updated = [];
      const skipped = [];

      for (const [productID, rawCount] of Object.entries(counts)) {
        const product = byId.get(productID);
        if (!product) {
          skipped.push({ productID, reason: "Unknown product" });
          continue;
        }
        if (product.is_composite) {
          skipped.push({ productID, reason: "Composite product" });
          continue;
        }

        const count = Number(rawCount);
        if (rawCount === null || rawCount === "" || !Number.isFinite(count)) {
          skipped.push({ productID, reason: "Count is not a number" });
          continue;
        }

        // setOpeningStock sets the amount, logs the movement and queues the sync
        updated.push(
          await stockRepository.setOpeningStock(productID, Math.max(0, count)),
        );
      }

      for (const product of products) {
        if (product.sold_without_recipe > 0) {
          await productRepository.setSoldWithoutRecipe(product.id, 0);
        }
      }

      return { success: true, updated, skipped };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
