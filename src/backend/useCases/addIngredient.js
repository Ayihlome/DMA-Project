import { db } from "../data/local/db";
import { enqueueSync, insertProduct, defaultPlural } from "./productSql";

const nextIngredientId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `ingredient-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

/**
 * addIngredient({ name, unit, packSize, packLabel?, cost?, unitPlural? })
 * Non-sellable product, stock starts at 0 (stock is counted, never guessed).
 */
export async function addIngredient({ name, unit, packSize, packLabel, cost, unitPlural }) {
  const cleanName = String(name ?? "").trim();
  const cleanUnit = String(unit ?? "").trim();
  const numericPackSize = packSize == null ? 1 : Number(packSize);
  const numericCost = cost == null ? 0 : Number(cost);

  if (!cleanName) throw new Error("Ingredient needs a name");
  if (!cleanUnit) throw new Error("Ingredient needs a unit");
  if (!Number.isFinite(numericPackSize) || numericPackSize <= 0) {
    throw new Error("Ingredient packSize must be greater than 0");
  }
  if (!Number.isFinite(numericCost) || numericCost < 0) {
    throw new Error("Ingredient cost cannot be negative");
  }
  if (unitPlural != null && !String(unitPlural).trim()) {
    throw new Error("Ingredient unitPlural cannot be empty");
  }

  const id = nextIngredientId();
  const now = new Date().toISOString();
  const product = {
    id,
    name: cleanName,
    category: "ingredients",
    unit: cleanUnit,
    unitPlural: unitPlural ? String(unitPlural).trim() : defaultPlural(cleanUnit),
    packSize: numericPackSize,
    packLabel: packLabel ?? null,
    cost: numericCost,
    price: 0,
    sellable: false,
    composite: false,
  };

  let row;
  await db.transaction(async (tx) => {
    row = await insertProduct(tx, product, now);
    await tx.execute(
      `insert into stock_items (product_id, quantity_on_hand, updated_at) values (?, 0, ?)`,
      [id, now],
    );
  });

  await enqueueSync("products", id, "insert", row);
  return { id, ...product };
}
