/**
 *
 * Called every time the cart changes (item added/removed/quantity edited)
 *
 * Input:
 *   { items: [{ productID: string, quantitySold: number }] }
 *
 * Output (success):
 *   {
 *     success: true,
 *     deductionsByProduct: {
 *       [cartProductID]: { productID, quantity }[]  // [] for simple products
 *     },
 *     deductionLines: { productID, name, unit, quantity }[]  // all items merged, for display
 *   }
 *
 * Output (failure — any composite item with a missing/incomplete recipe):
 *   { success: false, errors: string[] }
 *
 * a missing/incomplete recipe must block the sale with an actionable
 * message, not silently skip the preview for that item
 */

export function createPreviewSaleDeductionUseCase({
  recipeEngine,
  productRepository,
}) {
  return async function previewSaleDeductions(input) {
    const deductionsByProduct = {};
    const errors = [];

    for (const item of input.items) {
      const product = await productRepository.getByID(item.productID);
      if (!product) {
        errors.push(`Unknown product ${item.productID}`);
        continue;
      }

      if (!product.is_composite) {
        // no need to check the recipe engine so it will be a empty list
        deductionsByProduct[item.productID] = [];
        continue;
      }

      const preview = await recipeEngine.previewDeductions({
        productID: item.productID,
        quantitySold: item.quantitySold,
      });

      if (!preview.success) {
        errors.push(...preview.errors);
        continue;
      }

      deductionsByProduct[item.productID] = preview.deductions;
    }

    if (errors.length > 0) {
      return { success: false, errors };
    }

    const totals = new Map();
    for (const list of Object.values(deductionsByProduct)) {
      for (const d of list) {
        totals.set(d.productID, (totals.get(d.productID) ?? 0) + d.quantity);
      }
    }
    const deductionLines = [];
    for (const [productID, quantity] of totals) {
      const product = await productRepository.getByID(productID);
      deductionLines.push({
        productID,
        name: product?.name ?? "item",
        unit: product?.unit ?? "",
        quantity,
      });
    }

    return { success: true, deductionsByProduct, deductionLines };
  };
}
