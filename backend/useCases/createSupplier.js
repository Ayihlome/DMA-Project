import Suppliers from "../domain/Supplier";
/**
 * Input: { name: string, contact?: string, location?: string }
 * Output (success): { success: true, supplier: Supplier }
 * Output (failure): { success: false, errors: string[] }
 */

export function createCreateSupplierUseCase({ supplierRepository }) {
  return async function createSupplier(input) {
    if (!input.name) {
      return { success: false, errors: ["name is required"] };
    }

    const supplier = new Suppliers({
      id: crypto.randomUUID(),
      name: input.name,
      contact: input.contact ?? null,
      location: input.location ?? null,
    });

    try {
      await supplierRepository.create(supplier);
    } catch (err) {
      return { success: false, errors: [err.messages] };
    }

    return { success: true, supplier };
  };
}
