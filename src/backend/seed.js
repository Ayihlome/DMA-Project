// Demo data for development: a few simple products, a Kota (composite) made from
// ingredients, and a supplier price for each stocked item.
//
// Like the screens, it only talks to the app through `useCases`, so it also shows
// how each use case is called. It runs once: if the database already has products,
// it does nothing.
//
//   import { seedDemoData } from "../../backend/seed";
//   await seedDemoData();

import { useCases } from "./useCases/container";

// create a product, or throw with the use case's own error so a bad seed is obvious
async function product(input) {
  const result = await useCases.createProduct(input);
  if (!result.success) {
    throw new Error(
      `Seed: could not create ${input.name}: ${result.errors.join(", ")}`,
    );
  }
  return result.product;
}

async function price(productID, supplierName, unitPrice, minimumOrder) {
  const result = await useCases.saveSupplierPrice({
    productID,
    supplierName,
    unitPrice,
    minimumOrder,
  });
  if (!result.success) {
    throw new Error(
      `Seed: could not save price from ${supplierName}: ${result.errors.join(", ")}`,
    );
  }
}

export async function seedDemoData() {
  const existing = await useCases.getSellableProducts({});
  if (existing.length > 0) return { seeded: false };

  // Simple products: they have their own stock and a selling price.
  const milk = await product({
    name: "Fresh Milk 1L",
    unit: "bottle",
    isComposite: false,
    sellingPrice: 15.5,
    category: "dairy",
    openingStock: 24,
  });
  const bread = await product({
    name: "White Bread 700g",
    unit: "loaf",
    isComposite: false,
    sellingPrice: 17,
    category: "bakery",
    openingStock: 30,
  });
  const cola = await product({
    name: "Coca-Cola 330ml",
    unit: "can",
    isComposite: false,
    sellingPrice: 13,
    category: "beverages",
    openingStock: 48,
  });

  // Ingredients: stocked, but not sold on their own (selling price 0 keeps them off the Sales grid).
  const chips = await product({
    name: "Chips (loose)",
    unit: "kg",
    isComposite: false,
    sellingPrice: 0,
    category: "ingredients",
    openingStock: 6,
  });
  const polony = await product({
    name: "Polony",
    unit: "kg",
    isComposite: false,
    sellingPrice: 0,
    category: "ingredients",
    openingStock: 3,
  });
  const cheese = await product({
    name: "Cheese slices",
    unit: "slice",
    isComposite: false,
    sellingPrice: 0,
    category: "ingredients",
    openingStock: 80,
  });

  // Composite product: no stock of its own. How many you can sell depends on the ingredients.
  const kota = await product({
    name: "Kota Special",
    unit: "kota",
    isComposite: true,
    sellingPrice: 35,
    category: "hot",
  });
  const recipe = await useCases.setRecipeComponents({
    parentProductID: kota.id,
    components: [
      { componentProductID: bread.id, quantityRequired: 0.25 }, // a quarter loaf
      { componentProductID: chips.id, quantityRequired: 0.15 },
      { componentProductID: polony.id, quantityRequired: 0.05 },
      { componentProductID: cheese.id, quantityRequired: 2 },
    ],
  });
  if (!recipe.success) {
    throw new Error(
      `Seed: could not save the Kota recipe: ${recipe.errors.join(", ")}`,
    );
  }

  // Supplier prices (per unit), so the Restock and Supply screens have something to compare.
  await price(milk.id, "Jumbo Cash & Carry", 12.5, 6);
  await price(milk.id, "Deviand Wholesale", 13.2, 1);
  await price(bread.id, "Jumbo Cash & Carry", 13.8, 10);
  await price(cola.id, "Jumbo Cash & Carry", 9.9, 24);
  await price(chips.id, "Deviand Wholesale", 38, 1);
  await price(polony.id, "Jumbo Cash & Carry", 54, 1);
  await price(cheese.id, "Deviand Wholesale", 1.4, 50);

  return { seeded: true };
}
