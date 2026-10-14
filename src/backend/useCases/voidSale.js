/**
 * Takes a recorded sale back (a wrong item, a double charge). The sale stays on file marked as
 * voided, so totals and best-seller order stop counting it, and the stock it took goes back.
 * Stock is put back using the product's recipe as it is today, the same rule the screens use.
 *
 * Input:  { saleID: string }
 * Output (success): { success: true, saleID }
 * Output (failure): { success: false, errors: string[] }
 */
export function createVoidSaleUseCase({
  saleRepository,
  productRepository,
  recipeRepository,
}) {
  return async function voidSale(input) {
    if (!input?.saleID) {
      return { success: false, errors: ["saleID is required"] };
    }
    const sale = await saleRepository.getSale(input.saleID);
    if (!sale)
      return { success: false, errors: [`Unknown sale ${input.saleID}`] };
    if (sale.voided_at)
      return { success: false, errors: ["Sale is already voided"] };

    const totals = new Map();
    const add = (productID, quantity) =>
      totals.set(productID, (totals.get(productID) ?? 0) + quantity);
    const withoutRecipe = new Map();

    for (const line of await saleRepository.getLineItems(input.saleID)) {
      if (!line.product_id) continue; // a quick-amount line took no stock
      const product = await productRepository.getByID(line.product_id);
      if (!product) continue;
      let meta = {};
      try {
        meta = JSON.parse(product.meta || "{}");
      } catch {}
      if (meta.untracked) continue; // vouchers were never deducted

      if (product.is_composite) {
        const parts = await recipeRepository.getComponentsByParentProductId(
          product.id,
        );
        if (!parts.length) {
          withoutRecipe.set(
            product.id,
            (withoutRecipe.get(product.id) ?? 0) + line.quantity_sold,
          );
        }
        for (const part of parts) {
          add(
            part.componentProductID,
            part.quantityRequired * line.quantity_sold,
          );
        }
      } else {
        add(product.id, line.quantity_sold);
      }
    }

    try {
      await saleRepository.voidSale({
        saleID: input.saleID,
        deductions: [...totals].map(([productID, quantity]) => ({
          productID,
          quantity,
        })),
        withoutRecipe: [...withoutRecipe],
      });
      return { success: true, saleID: input.saleID };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };
}
