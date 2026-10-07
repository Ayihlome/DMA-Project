import { open } from "@op-engineering/op-sqlite";

//  SQLCipher key should come from flutter_secure_storage's RN equivalent
export const db = open({
  name: "stockmate.db",
  encryptionKey: process.env.SQLCIPHER_KEY,
});

export function runMigration() {
  db.execute(`
        create table if not exists products (
      id text primary key,
      name text not null,
      sku text,
      unit text not null,
      is_composite integer not null default 0,
      selling_price real,
      category text, 
      created_at text not null,
      updated_at text not null,
      is_deleted integer not null default 0
    );
    `);

  db.execute(`
    create table if not exists recipe_components (
      id text primary key,
      parent_product_id text not null references products(id),
      component_product_id text not null references products(id),
      quantity_required real not null,
      updated_at text not null,
      is_deleted integer not null default 0
    );
  `);

  db.execute(`
    create table if not exists stock_items (
      product_id text primary key references products(id),
      quantity_on_hand real not null,
      reorder_point real,
      last_restocked_at text,
      updated_at text not null
    );
  `);

  db.execute(`
    create table if not exists stock_movements (
      id text primary key,
      product_id text not null references products(id),
      delta real not null,
      resulting_quantity real not null,
      reason text not null,
      created_at text not null
    );
  `);

  db.execute(`
    create index if not exists idx_stock_movements_product_time
    on stock_movements (product_id, created_at);
  `);

  db.execute(`
    create table if not exists sales (
      id text primary key,
      owner_id text not null,
      "timestamp" text not null,
      total_amount real not null,
      sync_status text not null default 'pending',
      updated_at text not null
    );
  `);

  db.execute(`
    create table if not exists sale_line_items (
      id text primary key,
      sale_id text not null references sales(id),
      product_id text not null references products(id),
      quantity_sold real not null,
      price_at_sale real not null,
      owner_id text not null,
      updated_at text not null
    );
  `);

  db.execute(`
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
  db.execute(`
    create table if not exists sync_queue (
      id text primary key,
      entity_type text not null,
      entity_id text not null,
      operation text not null,
      payload_json text not null,
      status text not null default 'pending',
      retry_count integer not null default 0,
      created_at text not null
    );
  `);

  db.execute(
    `create table if not exist suppliers (
    name text primary key,
    contact integer not null,
    location text not null
    );`,
  );

  db.execute(
    `create table if not exist supplier_prices (
    supplier text primary key,
    product text not null,
    unit_price integer not null,
    minimum_order integer not null
    );`,
  );
}
