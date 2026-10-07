import RecipeComponent from "../domain/Recipe";

/**
 *
 * Defines (or replaces) the full bill-of-materials for a composite product. Every call overwrites the previous set
 *
 * Input:
 *   {
 *     parentProductID: string,
 *     components: [{ componentProductID: string, quantityRequired: number }]
 *   }
 *
 * Output (success): { success: true }
 * Output (failure): { success: false, errors: string[] }
 */

export function createSetRecipeComponentsUseCase({
  recipeRepository,
  productRepository,
}) {
  return async function setRecipeComponents(input) {
    const parent = await productRepository.getByID(input.parentProductID);
    if (!parent) {
      return {
        success: false,
        errors: [`Unkown product ${input.parentProductID}`],
      };
    }

    if (!parent.is_composite) {
      //guardrail: don't let a simple product silently acquire a BOM
      return {
        success: false,
        errors: [`${parent.name} is not marked composite`],
      };
    }

    if (!input.components || input.components.length === 0) {
      return {
        success: false,
        errors: ["At least one component is required"],
      };
    }

    for (const component of input.components) {
      const componentProduct = await productRepository.getByID(
        component.componentProductID,
      );
      if (!componentProduct) {
        return {
          success: false,
          errors: [`Unkown component product ${component.componentProductID}`],
        };
      }

      if (!component.quantityRequired || component.quantityRequired <= 0) {
        return {
          success: false,
          errors: [
            `quantityRequired must be greater than 0 for ${component.componentProductID}`,
          ],
        };
      }
    }

    const components = input.components.map(
      (c) =>
        new RecipeComponent({
          id: crypto.randomUUID(),
          parentProductID: input.parentProductID,
          componentProductID: c.componentProductID,
          quantityRequired: c.quantityRequired,
        }),
    );

    try {
      await recipeRepository.setComponentsForParent(
        input.parentProductID,
        components,
      );
    } catch (err) {
      return { success: false, errors: [err.message] };
    }

    return { success: true };
  };
}
