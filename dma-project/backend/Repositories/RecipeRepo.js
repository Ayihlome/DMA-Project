class RecipeRepository {
  constructor(database) {
    this.database = database;
  }

  getComponentsByParentProductId(productId) {
    return this.database
      .prepare(
        `
                SELECT
                    parent_product_id,
                    component_product_id,
                    quantity_required
                FROM recipe_components
                WHERE parent_product_id = ?
            `,
      )
      .all(productId);
  }
}

module.exports = RecipeRepository;
