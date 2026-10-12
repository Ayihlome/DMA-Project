import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";


export const SETTINGS_KEYS = {
  profile: "profile",
  onboardedAt: "onboardedAt",
  sellGrid: "sellGrid",
  budget: "budget",
  prefferedSuppliers: "prefferedSuppliers",
  ownerId:"ownerId",
};
export default class DeviceSettingsRepository {
  async get(key) {
    const result = await db.execute (
      "select value from device_settings where key = ?",
      [key],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].value;
  }

  async set (key, value) {
    await db.execute (
    `insert into device_settings (key, value, updated_at)
      values (?, ?, ?)
      on conflict (key) do update set 
        value = excluded.value,
        updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()],
    );
  }

  async getJSON (key, fallback) {
    const value = await this.get(key);
    if (value === null) return fallback;
    try {
      return JSON.parse (value);
    } catch (error) {
      return fallback;
    }
  }

  async setJSON(key, object) {
    await this.set(key, JSON.stringify (object));
  }

  // defaults fill anything that was not saved ^
  async mergeJSON(key, changes, defaults = {}) {
    const saved = await this.getJSON(key, {});
    const merged = { ...defaults, ... saved, ...changes };
    await this.setJSON( key, merged);
    return merged;
  }

  async updateProfile (changes) {
    const profile = await this.mergeJSON (SETTINGS_KEYS.profile, changes);

    // role and memberSince not defined on profiles table, stays local
    const remote = {};
    if (changes.ownerName !== undefined) remote.display_name = changes.ownerName;
    if (changes.storeName !== undefined) remote.display_shop_name = changes.storeName;

    const ownerID = await this.get(SETTINGS_KEYS.ownerId);
    if (ownerID === null || Object.keys(remote).length === 0) {
      return { profile, queued: false };
    }

    await enqueueSync ("profiles", ownerID, "update", remote) :
    return {profile, queued: true };
  }
}
      
    










  
