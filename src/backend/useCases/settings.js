// The small per-phone settings the screens keep: budget, sell grid, restock day, onboarding.
// They live in the device_settings table and are never sent to Supabase (except the
// shop and owner name, which updateProfile queues for the profiles table).
import {
  SETTINGS_KEYS,
  DEFAULT_SELL_GRID,
} from "../Repositories/DeviceSettingsRepo";

/**
 * Input:  { amount: number }   // the restock budget in rand, 0 or more
 * Output: { success: true, budget } | { success: false, errors: string[] }
 */
export function createSetBudgetUseCase({ deviceSettingsRepository }) {
  return async function setBudget(input) {
    const amount = Number(input?.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      return { success: false, errors: ["amount must be 0 or more"] };
    }
    try {
      await deviceSettingsRepository.setJSON(SETTINGS_KEYS.budget, amount);
      return { success: true, budget: amount };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * Merges a change into the Sell grid settings (order, hidden tiles, last used).
 *
 * Input:  { patch: { order?: string[] | null, hidden?: string[], lastUsed?: object, lastAmount?: object } }
 * Output: { success: true, sellGrid } | { success: false, errors: string[] }
 */
export function createSaveSellGridUseCase({ deviceSettingsRepository }) {
  return async function saveSellGrid(input) {
    const patch = input?.patch;
    if (typeof patch !== "object" || patch === null || Array.isArray(patch)) {
      return { success: false, errors: ["patch must be an object"] };
    }
    try {
      const sellGrid = await deviceSettingsRepository.mergeJSON(
        SETTINGS_KEYS.sellGrid,
        patch,
        DEFAULT_SELL_GRID,
      );
      return { success: true, sellGrid };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * The day the owner goes shopping.
 *
 * Input:  { day: 0..6 }   // 0 = Sunday
 * Output: { success: true, day } | { success: false, errors: string[] }
 */
export function createSetRestockDayUseCase({ deviceSettingsRepository }) {
  return async function setRestockDay(input) {
    const day = Number(input?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) {
      return {
        success: false,
        errors: ["day must be a whole number from 0 to 6"],
      };
    }
    try {
      await deviceSettingsRepository.setJSON(SETTINGS_KEYS.restockDay, day);
      return { success: true, day };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * Marks onboarding as finished (or skipped) and saves the profile typed in it.
 *
 * Input:  { profile?: { ownerName?, storeName?, role?, memberSince? }, at?: number }
 * Output: { success: true, onboardedAt } | { success: false, errors: string[] }
 */
export function createMarkOnboardedUseCase({ deviceSettingsRepository }) {
  return async function markOnboarded(input) {
    const at = Number.isFinite(input?.at) ? input.at : Date.now();
    try {
      if (input?.profile && typeof input.profile === "object") {
        await deviceSettingsRepository.updateProfile(input.profile);
      }
      await deviceSettingsRepository.setJSON(SETTINGS_KEYS.onboardedAt, at);
      return { success: true, onboardedAt: at };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
