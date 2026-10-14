// ONE place for table/column names. Real schema (db.js):
// products(id, name, sku, unit, is_composite, selling_price, category, pack_size,
//          meta, sold_without_recipe, created_at, updated_at, is_deleted)
// Fields without a column (cost, sellable, menu, unitPlural, packLabel, ...) live in `meta` JSON.
import { enqueueSync } from "../data/local/syncqueue";

export const round2 = (n) => Math.round(n * 100) / 100;

export const defaultPlural = (unit) =>
  ["kg", "g", "L", "l", "ml"].includes(unit) ? unit : `${unit}s`;

export const parseMeta = (raw) => {
  try {
    return JSON.parse(raw ?? "{}") ?? {};
  } catch {
    return {};
  }
};

/** Insert a product row inside a transaction. Returns the row for syncing. */
export async function insertProduct(tx, p, now) {
  const unit = p.unit ?? "each";
  const meta = {
    cost: p.cost ?? 0,
    sellable: p.sellable !== false,
    menu: p.menu ?? null,
    unitPlural: p.unitPlural ?? defaultPlural(unit),
    packLabel: p.packLabel ?? null,
    ...(p.detail ? { detail: p.detail } : {}),
    ...(p.icon ? { icon: p.icon } : {}),
    ...(p.image ? { image: p.image } : {}),
    ...(p.family ? { family: p.family, variant: p.variant } : {}),
    ...(p.size ? { size: p.size } : {}),
    ...(p.priceOptions ? { priceOptions: p.priceOptions } : {}),
    ...(p.untracked ? { untracked: true } : {}),
  };
  const row = {
    id: p.id,
    name: p.name,
    sku: p.sku ?? null,
    unit,
    is_composite: p.composite ? 1 : 0,
    selling_price: p.price ?? 0,
    category: p.category,
    pack_size: p.packSize ?? 1,
    meta: JSON.stringify(meta),
    created_at: now,
    updated_at: now,
    is_deleted: 0,
  };
  const cols = Object.keys(row);
  await tx.execute(
    `insert into products (${cols.join(", ")}) values (${cols.map(() => "?").join(", ")})`,
    cols.map((c) => row[c]),
  );
  return row;
}

/** Merge fields into a product's meta JSON (inside a transaction). Returns the new meta. */
export async function patchMeta(tx, id, patch) {
  const { rows } = await tx.execute(`select meta from products where id = ?`, [
    id,
  ]);
  if (rows.length === 0) throw new Error(`Product ${id} not found`);
  return { ...parseMeta(rows[0].meta), ...patch };
}

/**
 * A product row as Supabase wants it: real booleans, and meta as an object (it is a jsonb column).
 * SQLite keeps 0/1 and JSON text, so a row read or built locally goes through this before it is queued.
 */
export const toSyncProduct = (row) => ({
  ...row,
  is_composite: !!row.is_composite,
  is_deleted: !!row.is_deleted,
  meta: typeof row.meta === "string" ? parseMeta(row.meta) : (row.meta ?? {}),
});

export async function insertRecipeLine(tx, parentId, componentId, qty, now) {
  const id = crypto.randomUUID();
  await tx.execute(
    `insert into recipe_components
       (id, parent_product_id, component_product_id, quantity_required, updated_at, is_deleted)
     values (?, ?, ?, ?, ?, 0)`,
    [id, parentId, componentId, qty, now],
  );
  return id;
}

export { enqueueSync };
