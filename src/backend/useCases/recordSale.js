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

    if (!input.items?.length) {
      return {
        success: false,
        errors: [`No items selected for sale`],
      };
    }

    for (const item of input.items) {
      if (item.quantitySold <= 0) {
        return {
          success: false,
          errors: [`Quantity for item ${item.productID} not selected`],
        };
      }

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
        allDeductions.push({
          productID: item.productID,
          quantity: item.quantitySold,
        });
      }
    }

    const deductionTotals = new Map();
    for (const deduction of allDeductions) {
      deductionTotals.set(
        deduction.productID,
        (deductionTotals.get(deduction.productID) ?? 0) + deduction.quantity,
      );
    }
    const deductions = [...deductionTotals].map(([productID, quantity]) => ({
      productID,
      quantity,
    }));

    for (const deduction of deductions) {
      if (
        !(await recipeEngine.checkStock(
          deduction.productID,
          deduction.quantity,
        ))
      ) {
        return {
          success: false,
          errors: [`Insufficient stock for ${deduction.productID}`],
        };
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
        deductions,
      });
    } catch (err) {
      // could be a productID or insufficient stock
      return { success: false, errors: [err.message] };
    }

    return { success: true, saleID, total };
  };
}
