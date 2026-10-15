import * as SecureStore from "expo-secure-store";
import * as Crypto from "expo-crypto";

// The encryption key for the local database.
//
// It is 32 random bytes made once on this phone and kept in the operating system's secure
// storage (Android Keystore / iOS Keychain). It is never written to code, .env, the database
// itself or Supabase.

const KEY_NAME = "stockevo.db.key";
const IMPORTED_FLAG = "stockevo.db.legacy_imported";

const OPTIONS = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const KEY_FORMAT = /^[0-9a-f]{64}$/;

/** Returns the 64-character hex key, creating and saving it the first time. */
export async function getDbKey() {
  const existing = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);

  if (existing != null) {
    // Never replace a stored key: a new one would lock the user out of their own data.
    if (!KEY_FORMAT.test(existing)) {
      throw new Error(
        "The stored database key is not valid, so the local database cannot be opened.",
      );
    }
    return existing;
  }

  const key = Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
  await SecureStore.setItemAsync(KEY_NAME, key, OPTIONS);
  return key;
}

/** True once the pre-encryption database (stockmate.db) has been copied across. */
export async function isLegacyImported() {
  return (await SecureStore.getItemAsync(IMPORTED_FLAG, OPTIONS)) === "1";
}

export async function markLegacyImported() {
  await SecureStore.setItemAsync(IMPORTED_FLAG, "1", OPTIONS);
}
