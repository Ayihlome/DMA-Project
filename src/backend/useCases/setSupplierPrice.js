export function createSetSupplierPriceUseCase({ supplierPriceRepository }) {
  return async function setSupplierPrice(input) {
    if (
      !input.supplierID ||
      !input.productID ||
      !Number.isFinite(input.unitPrice) ||
      input.unitPrice < 0 ||
      (input.minimumOrder != null &&
        (!Number.isFinite(input.minimumOrder) || input.minimumOrder < 0))
    ) {
      return {
        success: false,
        errors: [
          "supplierID, productID, and a non-negative unitPrice are required",
        ],
      };
    }

    try {
      const price = await supplierPriceRepository.setSupplierPrice({
        id: crypto.randomUUID(),
        supplierID: input.supplierID,
        productID: input.productID,
        unitPrice: input.unitPrice,
        minimumOrder: input.minimumOrder ?? null,
      });
      return { success: true, price };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
