// Fails when the useStore() contract changes without someone updating store-contract.json.
//   node scripts/check-store-contract.mjs           check
//   node scripts/check-store-contract.mjs --update  accept the current contract
import { readFileSync, writeFileSync } from "node:fs";

const WATCHED = [
  ["src/data/actions.ts", "StoreApi"],
  ["src/data/types.ts", "AppState"],
  ["src/data/types.ts", "Product"],
  ["src/data/types.ts", "Sale"],
  ["src/data/types.ts", "SaleLine"],
];

function keysOf(file, name) {
  const lines = readFileSync(file, "utf8").split("\n");
  const start = lines.findIndex((l) => l.startsWith(`export type ${name} = {`));
  if (start < 0) throw new Error(`${name} not found in ${file}`);
  const keys = [];
  for (let i = start + 1; i < lines.length && !lines[i].startsWith("}"); i++) {
    const m = lines[i].match(/^ {2}(?:readonly )?(\w+)(\?)?:/); // top-level members only
    if (m) keys.push(m[1] + (m[2] ?? ""));
  }
  return keys.sort();
}

const current = Object.fromEntries(WATCHED.map(([f, n]) => [n, keysOf(f, n)]));
const file = "store-contract.json";

if (process.argv.includes("--update")) {
  writeFileSync(file, JSON.stringify(current, null, 2) + "\n");
  console.log("store-contract.json updated");
  process.exit(0);
}

const frozen = JSON.parse(readFileSync(file, "utf8"));
let bad = false;
for (const name of Object.keys(current)) {
  const added = current[name].filter((k) => !frozen[name]?.includes(k));
  const removed = (frozen[name] ?? []).filter(
    (k) => !current[name].includes(k),
  );
  if (added.length || removed.length) {
    bad = true;
    console.error(`${name} changed: +[${added}] -[${removed}]`);
  }
}
if (bad) {
  console.error(
    "\nThe useStore() contract moved. Tell the backend owner, implement it in src/data/sqliteStore.tsx,\nthen run: node scripts/check-store-contract.mjs --update",
  );
  process.exit(1);
}
console.log("store contract unchanged");
