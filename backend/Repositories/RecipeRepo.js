import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class RecipeRepository {
  async getComponentsByParentProductId(productID) {
    const { rows } = await db.execute(
      `select component_product_id as componentProductID, quantity_required as quantityRequired
       from recipe_components where parent_product_id = ? and is_deleted = 0`,
      [productID],
    );
    // empty array is a valid response for the RecipeEngine since it decides what it means (no recipe needed or recipe missing) based on the isComposite flag

    return rows;
  }

  async setComponentsForParent(parentProductID, components) {
    await db.transaction(async (tx) => {
      const now = new Date().toISOString();

      const { rows: exisiting } = await tx.execute(
        `select id from recipe_components where parent_product_id = ? and is_deleted = 0`,
        [parentProductID],
      );

      //every call overwrites the previous component set for this parent
      for (const row of exisiting) {
        await tx.execute(
          `update recipe_components set is_deleted = 1, updated_at = ? where id = ?`, //soft delete the old rows
          [now, row.id],
        );
        await enqueueSync("recipe_components", row.id, "update", {
          is_deleted: true,
        });
      }

      for (const component of components) {
        const id = crypto.randomUUID();
        await tx.execute(
          `insert into recipe_components (id, parent_product_id, component_product_id, quantity_required, updated_at, is_deleted) values (?, ?, ?, ?, ?, 0)`,
          [
            id,
            parentProductID,
            component.componentProductID,
            component.quantityRequired,
            now,
          ],
        );

        await enqueueSync("recipe_components", id, "insert", {
          parentProductID,
          componentProductID: component.componentProductID,
          quantityRequired: component.quantityRequired,
        });
      }
    });
  }
}

module.exports = RecipeRepository;
