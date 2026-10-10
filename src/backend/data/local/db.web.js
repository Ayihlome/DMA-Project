/**
 * Web stand-in for the SQLite layer.
 *
 * op-sqlite is a native module (iOS and Android only), so importing db.js in a
 * browser fails the whole bundle. Metro picks this file instead on web, exactly
 * as it does for supabase.web.ts.
 *
 * On web the app's data comes from src/store.tsx (AsyncStorage) and Supabase, so
 * there is nothing for this to do. Anything that genuinely needs SQLite should
 * check Platform.OS before calling in, rather than relying on these throwing.
 */

export const db = {
  execute() {
    throw new Error('SQLite is not available on web. Guard this call with Platform.OS !== "web".')
  },
  transaction() {
    throw new Error('SQLite is not available on web. Guard this call with Platform.OS !== "web".')
  },
}

/** No tables to create in a browser. Resolves so callers can await it unconditionally. */
export async function runMigration() {}
