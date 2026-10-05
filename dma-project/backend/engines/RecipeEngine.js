// import RecipeComponent from "domain/recipe.js"

class StockUpdateResult {
  constructor(success, deductions = [], errors = []) {
    this.success = success;
    this.deductions = deductions;
    this.errors = errors;
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

  async previewDeductions(saleLineItem) {
    // 1. we get the components of the item
    const components = await this.resolveComposite(saleLineItem.productID);

    if (components.length === 0) {
      // if none return nothing
      return new StockUpdateResult(
        false,
        [],
        ["No recipe components found for product"],
      );
    }

    //2. Calculate required deductions
    const deductions = components.map((component) => {
      const quantityToDeduct =
        saleLineItem.quantitySold * component.quantityRequired;

      return {
        productID: component.componentProductID,
        quantity: quantityToDeduct,
      };
    });

    //3. Validate before stock changes
    for (const deduction of deductions) {
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
