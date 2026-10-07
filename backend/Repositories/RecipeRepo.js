import { db } from "../data/local/db";

class RecipeRepository {
  constructor(database) {
    this.database = database;
  }

  async getComponentsByParentProductId(productID) {
    const { rows } = await db.execute(
      `select component_product_id as componentProductID, quantity_required as quantityRequired
       from recipe_components where parent_product_id = ? and is_deleted = 0`,
      [productID],
    );
    // empty array is a valid response for the RecipeEngine since it decides what it means (no recipe needed or recipe missing) based on the isComposite flag

    return rows;
  }
}

module.exports = RecipeRepository;
