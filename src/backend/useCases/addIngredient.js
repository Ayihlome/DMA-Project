import { db } from "../data/local/db";
import {
  enqueueSync,
  insertProduct,
  defaultPlural,
  toSyncProduct,
} from "./productSql";

const nextIngredientId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `ingredient-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * A new stock item to use as an ingredient: counted and bought, never sold.
 * Stock starts at 0 (stock is counted, never guessed).
 *
 * Input:  { id?, name, unit, packSize?, packLabel?, cost?, unitPlural? }
 *         pass `id` when the screen already shows the ingredient under that id
 * Output: { success: true, id, ...product } | { success: false, errors: string[] }
 */
export async function addIngredient({
  id: givenId,
  name,
  unit,
  packSize,
  packLabel,
  cost,
  unitPlural,
} = {}) {
  const cleanName = String(name ?? "").trim();
  const cleanUnit = String(unit ?? "").trim();
  const numericPackSize = packSize == null ? 1 : Number(packSize);
  const numericCost = cost == null ? 0 : Number(cost);

  if (!cleanName)
    return { success: false, errors: ["Ingredient needs a name"] };
  if (!cleanUnit)
    return { success: false, errors: ["Ingredient needs a unit"] };
  if (!Number.isFinite(numericPackSize) || numericPackSize <= 0) {
    return {
      success: false,
      errors: ["Ingredient packSize must be greater than 0"],
    };
  }
  if (!Number.isFinite(numericCost) || numericCost < 0) {
    return { success: false, errors: ["Ingredient cost cannot be negative"] };
  }
  if (unitPlural != null && !String(unitPlural).trim()) {
    return {
      success: false,
      errors: ["Ingredient unitPlural cannot be empty"],
    };
  }

  const id = givenId ?? nextIngredientId();
  const now = new Date().toISOString();
  const product = {
    id,
    name: cleanName,
    category: "ingredients",
    unit: cleanUnit,
    unitPlural: unitPlural
      ? String(unitPlural).trim()
      : defaultPlural(cleanUnit),
    packSize: numericPackSize,
    packLabel: packLabel ?? null,
    cost: numericCost,
    price: 0,
    sellable: false,
    composite: false,
  };

  try {
    await db.transaction(async (tx) => {
      const row = await insertProduct(tx, product, now);
      await tx.execute(
        `insert into stock_items (product_id, quantity_on_hand, updated_at) values (?, 0, ?)`,
        [id, now],
      );
      await enqueueSync("products", id, "insert", toSyncProduct(row));
    });
    return { success: true, ...product };
  } catch (error) {
    return { success: false, errors: [error.message] };
  }
}
