/* * Input:
 *   {
 *     ownerID: string,
 *     items: [{
 *       productID: string,        // or QUICK_AMOUNT_ID for an "Other R15" line
 *       quantitySold: number,
 *       price?: number,           // airtime amount, or the quick amount
 *       label?: string,           // quick amount only
 *     }],
 *     payment?: "Cash" | "Card" | "EFT",
 *     cashGiven?: number,         // only kept when payment is Cash
 *     allowNegativeStock?: boolean, // v2: never block a sale; flag it for a count instead
 *   }
 *
 * Output (success):
 *   { success: true, saleID, total, negativeStock: string[], soldWithoutRecipe: string[] }
 *
 * Output (failure):
 *   { success: false, errors: string[] }
 */

export const QUICK_AMOUNT_ID = "quick-amount";
const PAYMENTS = ["Cash", "Card", "EFT"];

function parseMeta(product) {
  try {
    return JSON.parse(product.meta || "{}");
  } catch {
    return {};
  }
}

export function createRecordSaleUseCase({
  recipeEngine,
  saleRepository,
  productRepository,
}) {
  return async function recordSale(input) {
    const lenient = input.allowNegativeStock === true;
    const lineItems = [];
    const allDeductions = [];
    const withoutRecipe = new Map(); // productID -> quantity sold with no recipe
    let total = 0;

    if (!input.items?.length) {
      return {
        success: false,
        errors: [`No items selected for sale`],
      };
    }
    if (input.payment != null && !PAYMENTS.includes(input.payment)) {
      return { success: false, errors: [`Unknown payment ${input.payment}`] };
    }

    for (const item of input.items) {
      if (!(item.quantitySold > 0)) {
        return {
          success: false,
          errors: [`Quantity for item ${item.productID} not selected`],
        };
      }

      // The keypad's "Other R15": money in, no product, no stock.
      if (item.productID === QUICK_AMOUNT_ID) {
        if (!(item.price > 0)) {
          return { success: false, errors: [`Enter an amount above R0`] };
        }
        lineItems.push({
          productID: null,
          label: item.label || "Other",
          quantitySold: item.quantitySold,
          priceAtSale: item.price,
        });
        total += item.price * item.quantitySold;
        continue;
      }

      const product = await productRepository.getByID(item.productID);
      if (!product) {
        return {
          success: false,
          errors: [`Unkown products ${item.productID}`],
        };
      }

      const meta = parseMeta(product);
      // Airtime: the amount picked at the counter is the price
      const price =
        meta.priceOptions?.length && item.price > 0
          ? item.price
          : product.selling_price;

      lineItems.push({
        productID: item.productID,
        quantitySold: item.quantitySold,
        priceAtSale: price,
      });
      total += price * item.quantitySold;

      if (meta.untracked) continue; // vouchers are sold, never deducted

      if (product.is_composite) {
        const preview = await recipeEngine.previewDeductions(
          { productID: item.productID, quantitySold: item.quantitySold },
          { checkStock: !lenient },
        );

        if (!preview.success) {
          if (lenient && preview.noRecipe) {
            // still sells, deducts nothing, and the owner is told to count
            withoutRecipe.set(
              item.productID,
              (withoutRecipe.get(item.productID) ?? 0) + item.quantitySold,
            );
            continue;
          }
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

    if (!lenient) {
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
    }

    const saleID = crypto.randomUUID();
    total = Math.round(total * 100) / 100;

    try {
      const { negativeStock } = await saleRepository.recordSale({
        saleID,
        ownerID: input.ownerID,
        timestamp: new Date().toISOString(),
        totalAmount: total,
        payment: input.payment ?? null,
        cashGiven: input.payment === "Cash" ? (input.cashGiven ?? null) : null,
        allowNegative: lenient,
        lineItems,
        deductions,
        withoutRecipe: [...withoutRecipe],
      });
      return {
        success: true,
        saleID,
        total,
        negativeStock,
        soldWithoutRecipe: [...withoutRecipe.keys()],
      };
    } catch (err) {
      // could be a productID or insufficient stock
      return { success: false, errors: [err.message] };
    }
  };
}
