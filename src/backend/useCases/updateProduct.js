/**
 * Edits an existing product.
 *
 * Input:
 *   {
 *     productID: string,
 *     name?: string,
 *     unit?: string,
 *     sellingPrice?: number,
 *     category?: string,
 *     packSize?: number,
 *     stockOnHand?: number,   // sets the stock count; ignored for made-to-order products
 *   }
 *
 * Output (success): { success: true }
 * Output (failure): { success: false, errors: string[] }
 */

export function createUpdateProductUseCase({
  productRepository,
  stockRepository,
}) {
  return async function updateProduct(input) {
    if (!input?.productID) {
      return { success: false, errors: ["productID is required"] };
    }
    if (input.name !== undefined && !String(input.name).trim()) {
      return { success: false, errors: ["name cannot be empty"] };
    }
    if (input.unit !== undefined && !String(input.unit).trim()) {
      return { success: false, errors: ["unit cannot be empty"] };
    }
    if (
      input.sellingPrice !== undefined &&
      !(Number.isFinite(input.sellingPrice) && input.sellingPrice >= 0)
    ) {
      return {
        success: false,
        errors: ["sellingPrice must be a non-negative number"],
      };
    }
    if (input.packSize !== undefined && !(input.packSize > 0)) {
      return { success: false, errors: ["packSize must be greater than 0"] };
    }
    if (
      input.stockOnHand !== undefined &&
      !(Number.isFinite(input.stockOnHand) && input.stockOnHand >= 0)
    ) {
      return { success: false, errors: ["stockOnHand cannot be negative"] };
    }

    const product = await productRepository.getByID(input.productID);
    if (!product) {
      return { success: false, errors: [`Unknown product ${input.productID}`] };
    }

    const changes = {};
    if (input.name !== undefined) changes.name = String(input.name).trim();
    if (input.unit !== undefined) changes.unit = String(input.unit).trim();
    if (input.sellingPrice !== undefined)
      changes.selling_price = input.sellingPrice;
    if (input.category !== undefined) changes.category = input.category;
    if (input.packSize !== undefined) changes.pack_size = input.packSize;

    try {
      if (Object.keys(changes).length > 0) {
        await productRepository.update(input.productID, changes);
      }
      if (input.stockOnHand !== undefined && !product.is_composite) {
        await stockRepository.setOpeningStock(
          input.productID,
          input.stockOnHand,
        );
      }
    } catch (err) {
      return { success: false, errors: [err.message] };
    }

    return { success: true };
  };
}
