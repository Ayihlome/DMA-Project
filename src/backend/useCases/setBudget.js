import { SETTINGS_KEYS } from "../Repositories/DeviceSettingsRepo";

export async function createSetBudgetUseCase({ deviceSettingsRepository }) {
  return async function setBudget(input) {
    if (!Number.isFinite(input?.amount)) {
      return { succcess: false, errors: ["amount must be a number"] }
    }

    const budget = Math.max(0, input.amount)
    try {
      await deviceSettingsRepository.set (SETTINGS_KEYS.budget, String(budget));
      return { success: true, budget };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
