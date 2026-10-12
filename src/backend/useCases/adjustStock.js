/**
 * Moves one product's stock up or down by a difference, and says why.
 * Unlike receiveStock the change may be negative, and the result may be below 0
 * (the shop never blocks a sale at 0, so a count can already be negative).
 *
 * Input:  { productID: string, delta: number, reason?: string }   // reason defaults to "adjustment"
 * Output (success): { success: true, stock: { productID, quantityOnHand } }
 * Output (failure): { success: false, errors: string[] }
 */
export function createAdjustStockUseCase({ stockRepository }) {
  return async function adjustStock(input) {
    if (
      !input?.productID ||
      !Number.isFinite(input.delta) ||
      input.delta === 0
    ) {
      return {
        success: false,
        errors: ["productID and a non-zero delta are required"],
      };
    }
    try {
      const stock = await stockRepository.applyStockChange(
        input.productID,
        input.delta,
        input.reason || "adjustment",
      );
      return { success: true, stock };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
