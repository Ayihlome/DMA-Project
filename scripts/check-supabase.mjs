// One-off connection check for the Supabase project in .env.
// Run from the repo root:  node --env-file=.env scripts/check-supabase.mjs
// Delete this file once the check passes.

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

// The auth settings endpoint needs a valid key but no tables, so it works on an empty database.
const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });

if (res.ok) {
  console.log(`OK: connected to ${url}`);
} else {
  console.error(`FAILED: ${res.status} ${res.statusText} from ${url}`);
  console.error(await res.text());
  process.exit(1);
}
