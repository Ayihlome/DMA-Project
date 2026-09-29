// import RecipeComponent from "domain/recipe.js"

class StockUpdateResult {
  constructor(success, updates = [], errors = []) {
    this.success = success;
    this.updates = updates;
    this.errors = errors;
  }
}
class RecipeEngine {
  constructor(recipe, stockItem) {
    this.recipeRepository = recipe;
    this.stockRepository = stockItem;
  }
  resolveComposite(productID) {
    // returns the component recipe(bread, chips etc) items of the parent (kota)
    return this.recipeRepository.getComponentByParentProductID(productID);
  }

  calcDeductions(saleLineItem) {
    // 1. we get the components of the item
    const components = this.resolveComposite(saleLineItem.productID);

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
      const valid = this.checkStock(deduction.productID, deduction.quantity);

      if (!valid) {
        return new StockUpdateResult(
          false,
          [],
          [`Insufficient stock for ${deduction.productID}`],
        );
      }
    }

    //4. Apply deductions
    const updates = [];

    for (const deduction of deductions) {
      const update = this.stockRepository.deductStock(
        deduction.productID,
        deduction.quantity,
      );

      updates.push(update);
    }

    // 5. Return result
    return new StockUpdateResult(true, updates, []);
  }

  checkStock(productID, quantity) {
    // check current stock of that item
    const stockItem = this.stockRepository.getStockByProductID(productID);

    if (!stockItem) {
      return false;
    }
    //checks if there is enough to be sold
    return stockItem.quantityOnHand >= quantity;
  }
}
