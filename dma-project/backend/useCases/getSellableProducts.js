/**
 * Powers the Record Sale product grid: search + category filter.
 *
 * Input:
 *   {
 *     ownerID: string,
 *     search?: string,     // matched against product name/sku, case-insensitive
 *     category?: string,   // omit or "all" for no category filter
 *   }
 *
 * Output: Product[] — already filtered, ready to render as tiles
 */

export function createGetSellableProductsUseCase({ productRepository }) {
  return async function getSellableProducts(input) {
    const allProducts = await productRepository.getAll();

    const search = (input.search ?? "").trim().toLowerCase();
    const category =
      input.category && input.category !== "all" ? input.category : null;

    return allProducts.filter((product) => {
      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        (product.sku ?? "").toLowerCase().includes(search);

      const matchesCategory = !category || product.category === category;

      return matchesSearch && matchesCategory;
    });
  };
}
