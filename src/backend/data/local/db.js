import * as SQLite from "expo-sqlite";
import { getDbKey, isLegacyImported, markLegacyImported } from "./dbKeys";

// The local database runs on expo-sqlite built with SQLCipher (see the "expo-sqlite" plugin entry
// in app.json), so the file on the phone is encrypted. The key is made once and kept in the
// operating system's secure storage (dbKey.js).
//
// Everything in the app talks to the database through the two calls below, so the
// repositories do not care which SQLite library sits underneath:
//
//   await db.execute(sql, params?)      -> { rows: object[] }
//   await db.transaction(async (tx) => { await tx.execute(sql, params?) ... })
//
// A transaction commits when the callback resolves and rolls back when it throws
// (recordSale relies on that to undo a sale that runs out of stock halfway).
// Transactions are queued one at a time, so two of them never overlap. While a
// transaction is open, plain db.execute calls (enqueueSync writes the sync_queue row
// this way) run on the same connection and so join that transaction, as they did before.

const DB_NAME = "stockevo.enc.db"; // encrypted
const LEGACY_DB_NAME = "stockmate.db"; // plain text, used before encryption was added
const ALLOW_PLAIN_IN_DEV =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_ALLOW_PLAIN_DB === "1";

// Raw-key syntax: SQLCipher uses the 32 bytes as they are (no password stretching).
const keyLiteral = (key) => `"x'${key}'"`;
const sqlString = (text) => `'${text.replace(/'/g, "''")}'`;

// Plain SQLite has no cipher_version, so this tells us whether SQLCipher is really in the build.
async function sqlCipherIsLinked() {
  const probe = await SQLite.openDatabaseAsync(":memory:");
  try {
    const row = await probe.getFirstAsync("pragma cipher_version");
    return Boolean(row && Object.values(row)[0]);
  } finally {
    await probe.closeAsync();
  }
}

async function dropLegacyDatabase() {
  try {
    await SQLite.deleteDatabaseAsync(LEGACY_DB_NAME);
  } catch {
    // Nothing to delete.
  }
}

// One-time copy of an existing plain-text database into the encrypted one, so data a phone
// already holds (including changes not yet synced) is not lost when this update is installed.
async function importLegacyDatabase(key) {
  if (await isLegacyImported()) {
    // An earlier run copied the data but stopped before deleting the plain-text file.
    await dropLegacyDatabase();
    return;
  }

  const legacy = await SQLite.openDatabaseAsync(LEGACY_DB_NAME);
  try {
    const row = await legacy.getFirstAsync(
      "select count(*) as n from sqlite_master",
    );
    if (Number(row?.n) > 0) {
      // Start from an empty target: a half-finished earlier copy would make the export fail.
      await SQLite.deleteDatabaseAsync(DB_NAME).catch(() => {});
      const folder = SQLite.defaultDatabaseDirectory.replace(/\/*$/, "");
      await legacy.execAsync(
        `ATTACH DATABASE ${sqlString(`${folder}/${DB_NAME}`)} AS enc KEY ${keyLiteral(key)};`,
      );
      await legacy.getFirstAsync("select sqlcipher_export('enc')");
      await legacy.execAsync("DETACH DATABASE enc;");
    }
  } finally {
    await legacy.closeAsync();
  }

  // The copy is only trusted once this flag is set; until then the plain file stays the source of truth.
  await markLegacyImported();
  await dropLegacyDatabase();
}

async function unlock(sqlite, key) {
  // PRAGMA key must be the first statement on the connection.
  await sqlite.execAsync(`PRAGMA key = ${keyLiteral(key)};`);
  try {
    // A wrong key (or a file that is not encrypted) only shows up on the first read.
    await sqlite.getFirstAsync("select count(*) from sqlite_master");
  } catch (error) {
    throw new Error(
      "The local database could not be unlocked with this phone's key.",
      {
        cause: error,
      },
    );
  }
}

async function openDatabase() {
  if (!(await sqlCipherIsLinked())) {
    if (ALLOW_PLAIN_IN_DEV) {
      console.warn(
        "[db] SQLCipher is not in this build, so the development database is NOT encrypted.",
      );
      return SQLite.openDatabaseAsync(LEGACY_DB_NAME);
    }
    throw new Error(
      "This build has no SQLCipher, so the local database cannot be encrypted. " +
        "Make a development build (npx expo run:android); Expo Go cannot be used.",
    );
  }

  const key = await getDbKey();
  await importLegacyDatabase(key);
  const sqlite = await SQLite.openDatabaseAsync(DB_NAME);
  await unlock(sqlite, key);
  return sqlite;
}

// Opened on first use and shared afterwards. A failure is not cached, so the next call retries.
let opening = null;
const getSqlite = () => {
  opening ??= openDatabase().catch((error) => {
    opening = null;
    throw error;
  });
  return opening;
};

const clean = (params = []) =>
  params.map((value) => (value === undefined ? null : value));

const run = async (sql, params) => ({
  rows: await (await getSqlite()).getAllAsync(sql, clean(params)),
});

let queue = Promise.resolve();
let inTransaction = false;
const inQueue = (task) => {
  const result = queue.then(task);
  queue = result.catch(() => {});
  return result;
};

export const db = {
  execute: (sql, params) =>
    inTransaction ? run(sql, params) : inQueue(() => run(sql, params)),

  transaction: (work) =>
    inQueue(async () => {
      const sqlite = await getSqlite();
      await sqlite.execAsync("BEGIN");
      inTransaction = true;
      try {
        const value = await work({ execute: run });
        await sqlite.execAsync("COMMIT");
        return value;
      } catch (error) {
        await sqlite.execAsync("ROLLBACK");
        throw error;
      } finally {
        inTransaction = false;
      }
    }),
};

/**
 * Whether the open database is SQLCipher-encrypted. The database is only ever opened with a key
 * when SQLCipher is present, so the SQLCipher version is the proof; null means plain SQLite.
 */
export async function encryptionStatus() {
  const { rows } = await db.execute("pragma cipher_version");
  const version = rows[0] ? Object.values(rows[0])[0] : null;
  return { encrypted: Boolean(version), cipherVersion: version ?? null };
}

export async function runMigration() {
  await db.execute(`
        create table if not exists products (
      id text primary key,
      name text not null,
      sku text,
      unit text not null,
      is_composite integer not null default 0,
      selling_price real,
      category text, 
      pack_size real not null default 1,
      meta text not null default '{}',
        sold_without_recipe integer not null default 0,
      created_at text not null,
      updated_at text not null,
      is_deleted integer not null default 0
    );
    `);

  await db.execute(`
    create table if not exists recipe_components (
      id text primary key,
      parent_product_id text not null references products(id),
      component_product_id text not null references products(id),
      quantity_required real not null,
      updated_at text not null,
      is_deleted integer not null default 0
    );
  `);

  await db.execute(`
    create table if not exists stock_items (
      product_id text primary key references products(id),
      quantity_on_hand real not null,
      reorder_point real,
      last_restocked_at text,
      updated_at text not null
    );
  `);

  await db.execute(`
    create table if not exists stock_movements (
      id text primary key,
      product_id text not null references products(id),
      delta real not null,
      resulting_quantity real not null,
      reason text not null,
      created_at text not null
    );
  `);

  await db.execute(`
    create index if not exists idx_stock_movements_product_time
    on stock_movements (product_id, created_at);
  `);

  await db.execute(`
    create table if not exists sales (
      id text primary key,
      owner_id text not null,
      "timestamp" text not null,
      total_amount real not null,
      payment text,
      cash_given real,
      voided_at text,
      sync_status text not null default 'pending',
      updated_at text not null
    );
  `);

  await db.execute(`
    create table if not exists sale_line_items (
      id text primary key,
      sale_id text not null references sales(id),
      product_id text references products(id),
      label text,
      quantity_sold real not null,
      price_at_sale real not null,
      owner_id text not null,
      updated_at text not null
    );
  `);

  await db.execute(`
    create table if not exists kpi_snapshots (
      id text primary key,
      product_id text not null unique references products(id),
      sales_velocity real,
      days_of_stock_remaining real,
      stockout_frequency real,
      turnover_rate real,
      computed_at text not null
    );
  `);

  // generic queue — one row per pending change, replayed to Supabase by the sync service on reconnect.
  // so adding a new synced table later doesn't require a schema change here.
  await db.execute(`
    create table if not exists sync_queue (
      id text primary key,
      entity_type text not null,
      entity_id text not null,
      operation text not null,
      payload_json text not null,
      status text not null default 'pending',
      retry_count integer not null default 0,
      created_at text not null,
      synced_at text,
      last_error text
    );
  `);

  // Databases created before these columns existed get them added (safe to re-run).
  const queueColumns = await db.execute(`pragma table_info(sync_queue)`);
  for (const column of ["synced_at", "last_error"]) {
    if (!queueColumns.rows.some((c) => c.name === column)) {
      await db.execute(`alter table sync_queue add column ${column} text`);
    }
  }

  await db.execute(
    `create table if not exists suppliers (
    id text primary key, 
    name text,
    contact text,
    location text,
    updated_at text not null,
    is_deleted integer not null default 0
    );`,
  );

  await db.execute(
    `create table if not exists supplier_prices (
    id text primary key,
    supplier_id text not null references suppliers(id),
    product_id text not null references products(id),
    unit_price real not null,
    minimum_order real,
    updated_at text not null,
    unique(supplier_id, product_id)
    );`,
  );

  await db.execute(`
    create table if not exists supplier_product_map (
      id text primary key,
      supplier_id text not null references suppliers(id),
      product_id text not null references products(id),
      external_source text not null,
      external_id text not null,
      external_name text,
      updated_at text not null,
      unique(supplier_id, product_id)
    );
  `);

  const productColumns = await db.execute(`pragma table_info(products)`);
  if (!productColumns.rows.some((column) => column.name === "pack_size")) {
    await db.execute(
      `alter table products add column pack_size real not null default 1`,
    );
  }

  await migrateSupplierTables();
  await migrateV2Columns();
  await migrateSupplierSourceColumns();

  // Small key/value store for things that belong to this phone (which account owns the data,
  // the restock budget, ...). These are never sent to Supabase.
  await db.execute(`
    create table if not exists device_settings (
      key text primary key,
      value text,
      updated_at text not null
    );
  `);

  // Restock orders the owner saved. Kept on this phone only (not synced yet). supplier_id has no
  // foreign key on purpose: migrateSupplierTables() renames the suppliers table.
  await db.execute(`
    create table if not exists purchase_orders (
      id text primary key,
      status text not null default 'ordered',
      budget real,
      regular_stock real not null default 0,
      created_at text not null,
      updated_at text not null
    );
  `);

  await db.execute(`
    create table if not exists purchase_order_lines (
      id text primary key,
      purchase_order_id text not null references purchase_orders(id),
      product_id text not null references products(id),
      supplier_id text,
      supplier_name text,
      quantity real not null,
      unit_price real not null,
      received_at text
    );
  `);

  // Restock orders: who the order is with, how it is paid, when it arrived.
  await addColumnIfMissing("purchase_orders", "supplier_id", "text");
  await addColumnIfMissing("purchase_orders", "payment", "text");
  await addColumnIfMissing("purchase_orders", "received_at", "text");
}

async function migrateSupplierTables() {
  const { rows: supplierColumns } = await db.execute(
    `pragma table_info(suppliers)`,
  );
  const { rows: priceColumns } = await db.execute(
    `pragma table_info(supplier_prices)`,
  );
  const supplierColumn = (name) =>
    supplierColumns.find((column) => column.name === name);
  const priceColumn = (name) =>
    priceColumns.find((column) => column.name === name);
  const suppliersNeedMigration =
    supplierColumn("contact")?.type?.toUpperCase() !== "TEXT" ||
    supplierColumn("location")?.notnull === 1 ||
    supplierColumn("is_deleted")?.type?.toUpperCase() !== "INTEGER";
  const pricesNeedMigration =
    !priceColumn("id") ||
    priceColumn("unit_price")?.type?.toUpperCase() !== "REAL" ||
    !priceColumn("updated_at");

  if (!suppliersNeedMigration && !pricesNeedMigration) return;

  await db.transaction(async (tx) => {
    await tx.execute(
      `alter table supplier_prices rename to supplier_prices_legacy`,
    );
    await tx.execute(`alter table suppliers rename to suppliers_legacy`);
    await tx.execute(`
      create table suppliers (
        id text primary key,
        name text,
        contact text,
        location text,
        updated_at text not null,
        is_deleted integer not null default 0
      )
    `);
    await tx.execute(`
      create table supplier_prices (
        id text primary key,
        supplier_id text not null references suppliers(id),
        product_id text not null references products(id),
        unit_price real not null,
        minimum_order real,
        updated_at text not null,
        unique(supplier_id, product_id)
      )
    `);

    const now = new Date().toISOString();
    const { rows: oldSuppliers } = await tx.execute(
      `select * from suppliers_legacy`,
    );
    for (const supplier of oldSuppliers) {
      await tx.execute(
        `insert into suppliers (id, name, contact, location, updated_at, is_deleted)
         values (?, ?, ?, ?, ?, ?)`,
        [
          supplier.id,
          supplier.name ?? null,
          supplier.contact == null ? null : String(supplier.contact),
          supplier.location ?? null,
          supplier.updated_at ?? now,
          [1, "1", "true"].includes(supplier.is_deleted) ? 1 : 0,
        ],
      );
    }

    const { rows: oldPrices } = await tx.execute(
      `select * from supplier_prices_legacy`,
    );
    for (const price of oldPrices) {
      await tx.execute(
        `insert into supplier_prices
         (id, supplier_id, product_id, unit_price, minimum_order, updated_at)
         values (?, ?, ?, ?, ?, ?)
         on conflict(supplier_id, product_id) do update set
           unit_price = excluded.unit_price,
           minimum_order = excluded.minimum_order,
           updated_at = excluded.updated_at`,
        [
          price.id ?? crypto.randomUUID(),
          price.supplier_id,
          price.product_id,
          Number(price.unit_price),
          price.minimum_order ?? price.min_order ?? null,
          price.updated_at ?? now,
        ],
      );
    }

    await tx.execute(`drop table supplier_prices_legacy`);
    await tx.execute(`drop table suppliers_legacy`);
  });
}

async function addColumnIfMissing(table, column, ddl) {
  const { rows } = await db.execute(`pragma table_info(${table})`);
  if (!rows.some((c) => c.name === column)) {
    await db.execute(`alter table ${table} add column ${column} ${ddl}`);
  }
}

// Phase 1 of supplier profiles: where a supplier's prices come from and how
// fresh they are. Optional columns, so manual suppliers keep working untouched.
async function migrateSupplierSourceColumns() {
  await addColumnIfMissing(
    "suppliers",
    "source_type",
    "text not null default 'manual'",
  );
  await addColumnIfMissing("suppliers", "source_url", "text");
  await addColumnIfMissing("suppliers", "last_synced_at", "text");
  await addColumnIfMissing("supplier_prices", "as_of", "text");
  await addColumnIfMissing("supplier_prices", "source", "text");
}

// Columns the v2 screens need. Safe to re-run.
async function migrateV2Columns() {
  await addColumnIfMissing("products", "meta", "text not null default '{}'");
  await addColumnIfMissing(
    "products",
    "sold_without_recipe",
    "integer not null default 0",
  );
  await addColumnIfMissing("sales", "payment", "text");
  await addColumnIfMissing("sales", "cash_given", "real");
  // A voided sale keeps its row (and its lines); voided_at says when it was taken back.
  await addColumnIfMissing("sales", "voided_at", "text");
  await addColumnIfMissing("sale_line_items", "label", "text");

  // SQLite cannot drop NOT NULL, so an older sale_line_items is rebuilt once.
  // A quick-amount line ("Other R15") has no product behind it.
  const { rows } = await db.execute(`pragma table_info(sale_line_items)`);
  if (rows.find((c) => c.name === "product_id")?.notnull === 1) {
    await db.transaction(async (tx) => {
      await tx.execute(`
        create table sale_line_items_new (
          id text primary key,
          sale_id text not null references sales(id),
          product_id text references products(id),
          label text,
          quantity_sold real not null,
          price_at_sale real not null,
          owner_id text not null,
          updated_at text not null
        )`);
      await tx.execute(`
        insert into sale_line_items_new
          (id, sale_id, product_id, label, quantity_sold, price_at_sale, owner_id, updated_at)
        select id, sale_id, product_id, label, quantity_sold, price_at_sale, owner_id, updated_at
        from sale_line_items`);
      await tx.execute(`drop table sale_line_items`);
      await tx.execute(
        `alter table sale_line_items_new rename to sale_line_items`,
      );
    });
  }
}
