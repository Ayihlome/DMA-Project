/* * Input:
 *   {
 *     ownerID: string,
 *     items: [{ productID: string, quantitySold: number }]
 *   }
 *
 * Output (success):
 *   { success: true, saleID: string, total: number }
 *
 * Output (failure):
 *   { success: false, errors: string[] }
 */

export function createRecordSaleUseCase({
  recipeEngine,
  saleRepository,
  productRepository,
}) {
  return async function recordSale(input) {
    const lineItems = [];
    const allDeductions = [];
    let total = 0;

    for (const item of input.items) {
      const product = await productRepository.getByID(item.productID);
      if (!product) {
        return {
          success: false,
          errors: [`Unkown products ${item.productID}`],
        };
      }

      lineItems.push({
        productID: item.productID,
        quantitySold: item.quantitySold,
        priceAtSale: product.selling_price,
      });

      total += product.selling_price * item.quantitySold;

      if (product.is_composite) {
        const preview = await recipeEngine.previewDeductions({
          productID: item.productID,
          quantitySold: item.quantitySold,
        });

        if (!preview.success) {
          return { success: false, errors: preview.errors };
        }
        allDeductions.push(...preview.deductions);
      } else {
        // if it isnt a composite item
        allDeductions.push(product);
      }
    }

    const saleID = crypto.randomUUID();

    try {
      await saleRepository.recordSale({
        saleID,
        ownerID: input.ownerID,
        timestamp: new Date().toISOString(),
        totalAmount: total,
        lineItems,
        deductions: allDeductions,
      });
    } catch (err) {
      // could be a productID or insufficient stock
      return { success: false, errors: [err.message] };
    }

    return { success: true, saleID, total };
  };
}
