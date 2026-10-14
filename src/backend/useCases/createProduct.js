import Product from "../domain/Product";
/**
 *
 * Input:
 *   {
 *     id?: string,            // the caller may pick the id (must be a uuid to sync)
 *     name: string,
 *     sku?: string,
 *     unit: string,
 *     isComposite: boolean,
 *     sellingPrice?: number,  // omit for ingredients (stored as 0)
 *     meta?: object,          // v2-only fields: family, menu, variant, size, priceOptions,
 *                             // untracked, sellable, detail, icon, unitPlural, packLabel, cost
 *     category?: string,
 *     packSize?: number,
 *     openingStock?: number,
 *   }
 *
 * Output (success): { success: true, product: Product }
 * Output (failure): { success: false, errors: string[] }
 */

export function createCreateProductUseCase({ productRepository }) {
  return async function createProduct(input) {
    if (!input.name || !input.unit) {
      return { success: false, errors: ["name and unit are required"] };
    }
    if (input.sellingPrice != null && !(input.sellingPrice >= 0)) {
      return {
        success: false,
        errors: ["sellingPrice must be a non-negative number"],
      };
    }
    if (input.packSize != null && input.packSize <= 0) {
      return { success: false, errors: ["packSize must be greater than 0"] };
    }
    if (input.openingStock != null && input.openingStock < 0) {
      return { success: false, errors: ["openingStock cannot be negative"] };
    }

    const product = new Product({
      id: input.id ?? crypto.randomUUID(),
      name: input.name,
      sku: input.sku,
      unit: input.unit,
      isComposite: input.isComposite,
      sellingPrice: input.sellingPrice ?? 0,
      meta: input.meta,
      category: input.category ?? null,
      packSize: input.packSize ?? 1,
      openingStock: input.openingStock ?? 0,
    });

    try {
      await productRepository.create(product);
    } catch (err) {
      return { success: false, errors: [err.message] };
    }

    return { success: true, product };
  };
}
