/**
 * Save and read the owner-confirmed links between a shop product and an external
 * catalogue item (supplier_product_map). The confirm screen calls saveSupplierMatch
 * once the owner picks a candidate returned by suggestSupplierMatches; the scheduled
 * sync then refreshes that product's price automatically.
 */
export function createSaveSupplierMatchUseCase({
  supplierProductMapRepository,
}) {
  return async function saveSupplierMatch(input) {
    const errors = [];
    if (!input?.supplierID) errors.push("supplierID is required");
    if (!input?.productID) errors.push("productID is required");
    if (!input?.externalID) errors.push("externalID is required");
    if (errors.length) return { success: false, errors };

    try {
      const map = await supplierProductMapRepository.upsert({
        supplierID: input.supplierID,
        productID: input.productID,
        externalSource: input.externalSource ?? "makro",
        externalID: input.externalID,
        externalName: input.externalName ?? null,
      });
      return { success: true, map };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

export function createGetSupplierMatchesUseCase({
  supplierProductMapRepository,
}) {
  return async function getSupplierMatches() {
    return supplierProductMapRepository.getAll();
  };
}
