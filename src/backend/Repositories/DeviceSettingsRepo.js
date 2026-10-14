import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

// Every key in the device_settings table that a use case reads or writes.
// The values must match what loadShop reads, so change them in both places.
export const SETTINGS_KEYS = {
  profile: "profile",
  onboardedAt: "onboardedAt",
  sellGrid: "sellGrid",
  budget: "budget",
  preferredSuppliers: "preferred",
  restockDay: "restockDay",
  ownerId: "owner", // DeviceRepo.setOwner stores the signed-in account under this key
};

export const DEFAULT_SELL_GRID = {
  order: null,
  hidden: [],
  lastUsed: {},
  lastAmount: {},
};

export default class DeviceSettingsRepository {
  async get(key) {
    const result = await db.execute(
      "select value from device_settings where key = ?",
      [key],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].value;
  }

  async set(key, value) {
    await db.execute(
      `insert into device_settings (key, value, updated_at)
       values (?, ?, ?)
       on conflict (key) do update set
         value = excluded.value,
         updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()],
    );
  }

  async getJSON(key, fallback) {
    const value = await this.get(key);
    if (value === null) return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  async setJSON(key, object) {
    await this.set(key, JSON.stringify(object));
  }

  // defaults fill anything that was not saved
  async mergeJSON(key, changes, defaults = {}) {
    const saved = await this.getJSON(key, {});
    const merged = { ...defaults, ...saved, ...changes };
    await this.setJSON(key, merged);
    return merged;
  }

  async updateProfile(changes) {
    const profile = await this.mergeJSON(SETTINGS_KEYS.profile, changes);

    // role and memberSince have no column on the profiles table, so they stay on the phone
    const remote = {};
    if (changes.ownerName !== undefined)
      remote.display_name = changes.ownerName;
    if (changes.storeName !== undefined) remote.shop_name = changes.storeName;

    const ownerID = await this.get(SETTINGS_KEYS.ownerId);
    if (ownerID === null || Object.keys(remote).length === 0) {
      return { profile, queued: false };
    }

    await enqueueSync("profiles", ownerID, "update", remote);
    return { profile, queued: true };
  }
}
