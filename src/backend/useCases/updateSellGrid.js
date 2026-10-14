import { SETTINGS_KEYS } from "../Repositories/DeviceSettingsRepo";

const defaultGrid = () => ({
  order: null,
  hidden: [],
  lastUsed: {},
  lastAmount: {},
});

const isObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function createUpdateSellGridUseCase({ deviceSettingsRepository }) {
  return async function updateSellGrid(input) {
    const errors =[];

    if (input?.order !== undefined && input.order != null && !Array.isArray(input.order)) {
      errors.push ("order must be a list or null");
    } 
    if (input?.hidden !== undefined && Array.isArray(input.hidden)) {
      errors.push("hidden must be a list");
    } 
    if (input?.lastUsed !== undefined && isObject(input.lastUsed)) {
      errors.push("lastUsed must an object");
    }
     if (input?.lasAmount !== undefined && isObject(input.lastAmount)) {
      errors.push("lastAmount must an object");
    }
    if (errors.length > 0) {
      return { success: false, errors };
    }

    const patch = {};
    if (input?.order !== undefined) patch.order = input.order;
    if (input?.hidden !== undefined) patch.hidden = input.hidden;
    if (input?.lastUsed !== undefined) patch.lastUsed = input.lastUsed;
    if (input?.lastAmount !== undefined) patch.lastAmount  = input.lastAmount;

    try {
      const grid = await deviceSettingsRepository.mergeJSON(
        SETTINGS_KEYS.sellGrid, 
        patch,
        defaultGrid,
      );
      return { success: true, grid };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
  
  







      
