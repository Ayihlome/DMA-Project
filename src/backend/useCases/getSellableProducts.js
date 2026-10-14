/**
 * Powers the Record Sale product grid and the Products list: search + category filter.
 *
 * Input (all optional):
 *   {
 *     ownerID?: string,
 *     search?: string,        // matched against product name/sku, case-insensitive
 *     category?: string,      // omit or "all" for no category filter
 *     sellableOnly?: boolean, // true = only products with a selling price above 0
 *                             //        (ingredients are created with a price of 0)
 *   }
 *
 * Output: Product[] — the product rows as stored (id, name, unit, category, selling_price,
 *   is_composite, pack_size, ...) plus three fields the tiles need:
 *     stockOnHand:       number   // own stock; 0 for a made-to-order product
 *     availableQuantity: number   // what can be sold right now. For a made-to-order product,
 *                                 // the scarcest ingredient decides.
 *     hasRecipe:         boolean  // a made-to-order product with no recipe cannot be sold
 */

export function createGetSellableProductsUseCase({
  productRepository,
  stockRepository,
  recipeRepository,
}) {
  async function onHand(productID) {
    const stock = await stockRepository.getStockByProductId(productID);
    return Number(stock?.quantityOnHand) || 0;
  }

  return async function getSellableProducts(input = {}) {
    const allProducts = await productRepository.getAll();

    const search = (input.search ?? "").trim().toLowerCase();
    const category =
      input.category && input.category !== "all" ? input.category : null;

    const matches = allProducts.filter((product) => {
      const matchesSearch =
        search.length === 0 ||
        product.name.toLowerCase().includes(search) ||
        (product.sku ?? "").toLowerCase().includes(search);

      const matchesCategory = !category || product.category === category;
      const matchesPrice =
        !input.sellableOnly || (Number(product.selling_price) || 0) > 0;

      return matchesSearch && matchesCategory && matchesPrice;
    });

    return Promise.all(
      matches.map(async (product) => {
        if (!product.is_composite) {
          const stockOnHand = await onHand(product.id);
          return {
            ...product,
            stockOnHand,
            availableQuantity: stockOnHand,
            hasRecipe: false,
          };
        }

        const parts = await recipeRepository.getComponentsByParentProductId(
          product.id,
        );
        const makeable = await Promise.all(
          parts.map(async (part) => {
            const needed = Number(part.quantityRequired) || 0;
            if (needed <= 0) return 0;
            return Math.floor(
              (await onHand(part.componentProductID)) / needed + 1e-9,
            );
          }),
        );
        return {
          ...product,
          stockOnHand: 0,
          availableQuantity: makeable.length ? Math.min(...makeable) : 0,
          hasRecipe: parts.length > 0,
        };
      }),
    );
  };
}
