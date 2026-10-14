/**
 * Says whose shop is on this phone. Call it once after sign-in.
 *
 * - First time, or the same account again: nothing is touched.
 * - A different account: the previous account's rows are cleared from this phone, so one
 *   owner never sees (or syncs) another owner's shop. Rows already on Supabase are kept there.
 * - { reset: true }: clears the shop for this account too (the "reset demo data" button).
 *
 * Rows still waiting in the sync queue are lost when they are cleared. A different account
 * can only be signed in on this phone after the previous one signed out.
 *
 * Input:  { ownerID: string, reset?: boolean }
 * Output: { success: true, cleared: boolean } | { success: false, errors: string[] }
 */
export function createClaimDeviceUseCase({ deviceRepository }) {
  return async function claimDevice(input) {
    if (!input?.ownerID) {
      return { success: false, errors: ["ownerID is required"] };
    }
    try {
      const current = await deviceRepository.getOwner();
      // Data with no recorded owner (the old frontend never wrote one) is adopted, not wiped.
      const clear =
        input.reset === true || (current !== null && current !== input.ownerID);
      if (clear) await deviceRepository.wipeShop();
      if (current !== input.ownerID)
        await deviceRepository.setOwner(input.ownerID);
      return { success: true, cleared: clear };
    } catch (err) {
      return { success: false, errors: [err.message] };
    }
  };
}
