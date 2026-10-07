import Product from "../domain/Product";
/**
 *
 * Input:
 *   {
 *     name: string,
 *     sku?: string,
 *     unit: string,
 *     isComposite: boolean,
 *     sellingPrice: number,
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
    if (input.sellingPrice == null || input.sellingPrice < 0) {
      return {
        success: false,
        errors: ["sellingPrice must be a non-negative number"],
      };
    }

    const product = new Product({
      id: crypto.randomUUID(),
      name: input.name,
      sku: input.sku,
      unit: input.unit,
      isComposite: input.isComposite,
      sellingPrice: input.sellingPrice,
    });

    try {
      await productRepository.create(product);
    } catch (err) {
      return { success: false, errors: [err.message] };
    }

    return { success: true, product };
  };
}
