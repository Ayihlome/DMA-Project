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
 *       [cartProductID]: { componentProductID, quantity }[]  // [] for simple products
 *     }
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

    return { success: true, deductionsByProduct };
  };
}
