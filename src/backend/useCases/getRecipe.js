/**
 * The recipe of a made-to-order product, for the recipe editor on the product page.
 *
 * Input:  { productID: string }
 * Output: [{ componentProductID, name, unit, quantityRequired }]   // empty when there is no recipe yet
 */
export function createGetRecipeUseCase({
  recipeRepository,
  productRepository,
}) {
  return async function getRecipe(input) {
    if (!input?.productID) return [];

    const components = await recipeRepository.getComponentsByParentProductId(
      input.productID,
    );
    const lines = await Promise.all(
      components.map(async (component) => {
        const product = await productRepository.getByID(
          component.componentProductID,
        );
        if (!product) return null;
        return {
          componentProductID: component.componentProductID,
          name: product.name,
          unit: product.unit,
          quantityRequired: Number(component.quantityRequired),
        };
      }),
    );
    return lines.filter(Boolean);
  };
}
