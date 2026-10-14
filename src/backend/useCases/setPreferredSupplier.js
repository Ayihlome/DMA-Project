import { SETTINGS_KEYS } from "../Repositories/DeviceSettingsRepo";

export function createSetPreferredSupplierUseCase({
  deviceSettingsRepository,
}) {
  return async function setPreferredSupplier(input) {
    if (!input?.productId || !input?.supplierId) {
      return {
        success: false,
        errors: ["productId and supplierId are required"],
      };
    }

    try {
      // Saved object maps a product id to its preferred supplier id
      const preferred = await deviceSettingsRepository.mergeJSON(
        SETTINGS_KEYS.preferredSuppliers,
        { [input.productId]: input.supplierId },
      );
      return { success: true, preferred };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
