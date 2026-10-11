/**
 * The "Add a price" form: a supplier typed by name and the price they quote for a product.
 * Uses the supplier with that name (ignoring upper/lower case) or creates it, then saves the
 * price. A repeat price for the same supplier and product replaces the old one.
 *
 * Input:
 *   {
 *     productID: string,
 *     supplierName: string,
 *     unitPrice: number,        // per unit, not per pack
 *     minimumOrder?: number,
 *   }
 *
 * Output (success): { success: true, supplier: Supplier, price: SupplierPrice }
 * Output (failure): { success: false, errors: string[] }
 */

export function createSaveSupplierPriceUseCase({
  supplierRepository,
  createSupplier,
  setSupplierPrice,
}) {
  return async function saveSupplierPrice(input) {
    const name = (input?.supplierName ?? "").trim();
    if (!name) {
      return { success: false, errors: ["Enter the supplier name."] };
    }
    if (!input.productID) {
      return { success: false, errors: ["productID is required"] };
    }

    const existing = (await supplierRepository.getAll()).find(
      (s) => String(s.name).toLowerCase() === name.toLowerCase(),
    );

    let supplier = existing;
    if (!supplier) {
      const created = await createSupplier({ name });
      if (!created.success) return created;
      supplier = created.supplier;
    }

    const saved = await setSupplierPrice({
      supplierID: supplier.id,
      productID: input.productID,
      unitPrice: input.unitPrice,
      minimumOrder: input.minimumOrder,
    });
    if (!saved.success) return saved;

    return { success: true, supplier, price: saved.price };
  };
}
