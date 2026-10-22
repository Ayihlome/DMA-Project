import { SETTINGS_KEYS } from "../Repositories/DeviceSettingsRepo";
import { parseMeta } from "./productSql";

/**
 * A stock count: sets the quantity on hand for the products the owner counted.
 *
 * Input:  { counts: { [productID]: number }, at?: number }   // at: when the count was saved (ms)
 * Output (success): { success: true, updated: StockItem[], skipped: { productID, reason }[] }
 * Output (failure): { success: false, errors: string[] }
 *
 * Made-to-order (composite) products are skipped, their stock comes from their ingredients.
 * A count never goes below 0. Products not in `counts` are left alone.
 *
 * Only a full count (every product with a shelf count) saves the time of the count, which the
 * next count checks the recipes against (see src/data/recipeCheck.ts). "Sold without a recipe"
 * flags are not touched here; saveMenuItem clears one when that item gets a recipe.
 * Same rule as setStockCounts in src/data/actions.ts.
 */
export function createSetStockCountsUseCase({
  productRepository,
  stockRepository,
  deviceSettingsRepository,
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

      // A full count: every product with a shelf count, so no kotas and no airtime
      const full = products
        .filter((p) => !p.is_composite && !parseMeta(p.meta).untracked)
        .every((p) => {
          const n = counts[p.id];
          return n !== null && n !== "" && Number.isFinite(Number(n));
        });
      if (full && deviceSettingsRepository) {
        await deviceSettingsRepository.setJSON(
          SETTINGS_KEYS.lastCountAt,
          Number.isFinite(input.at) ? input.at : Date.now(),
        );
      }

      return { success: true, updated, skipped };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
