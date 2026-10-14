// import RecipeComponent from "domain/recipe.js"

class StockUpdateResult {
  constructor(success, deductions = [], errors = [], noRecipe = false) {
    this.success = success;
    this.deductions = deductions;
    this.errors = errors;
    this.noRecipe = noRecipe; // the product has no recipe components at all
  }
}
class RecipeEngine {
  constructor(recipe, stockItem) {
    this.recipeRepository = recipe;
    this.stockRepository = stockItem;
  }
  async resolveComposite(productID) {
    // returns the component recipe(bread, chips etc) items of the parent (kota)
    return this.recipeRepository.getComponentsByParentProductId(productID);
  }

  // { checkStock: false } skips the stock check, for shops that never block a sale at 0
  async previewDeductions(saleLineItem, { checkStock = true } = {}) {
    // 1. we get the components of the item
    const components = await this.resolveComposite(saleLineItem.productID);

    if (components.length === 0) {
      // if none return nothing
      return new StockUpdateResult(
        false,
        [],
        ["No recipe components found for product"],
        true,
      );
    }

    //2. Calculate required deductions
    const deductionTotals = new Map();
    for (const component of components) {
      const quantityToDeduct =
        saleLineItem.quantitySold * component.quantityRequired;
      deductionTotals.set(
        component.componentProductID,
        (deductionTotals.get(component.componentProductID) ?? 0) +
          quantityToDeduct,
      );
    }
    const deductions = [...deductionTotals].map(([productID, quantity]) => ({
      productID,
      quantity,
    }));

    //3. Validate before stock changes
    for (const deduction of checkStock ? deductions : []) {
      const valid = await this.checkStock(
        deduction.productID,
        deduction.quantity,
      );

      if (!valid) {
        return new StockUpdateResult(
          false,
          [],
          [`Insufficient stock for ${deduction.productID}`],
        );
      }
    }

    return new StockUpdateResult(true, deductions, []);
  }

  async calcDeductions(saleLineItem) {
    const preview = await this.previewDeductions(saleLineItem);
    if (!preview.success) return preview;

    const updates = [];
    for (const deduction of preview.deductions) {
      updates.push(
        await this.stockRepository.deductStock(
          deduction.productID,
          deduction.quantity,
        ),
      );
    }

    return new StockUpdateResult(true, updates, []);
  }

  async checkStock(productID, quantity) {
    // check current stock of that item
    const stockItem = await this.stockRepository.getStockByProductId(productID);

    if (!stockItem) {
      return false;
    }
    //checks if there is enough to be sold
    return stockItem.quantityOnHand >= quantity;
  }
}

export default RecipeEngine;
