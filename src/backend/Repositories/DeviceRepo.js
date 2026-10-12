import { db } from "../data/local/db";

// Children first, so foreign keys never block the delete.
const SHOP_TABLES = [
  "sale_line_items",
  "sales",
  "stock_movements",
  "stock_items",
  "recipe_components",
  "supplier_prices",
  "suppliers",
  "purchase_order_lines",
  "purchase_orders",
  "kpi_snapshots",
  "sync_queue",
  "products",
];

// Who owns the shop on this phone, and clearing it for someone else.
class DeviceRepository {
  async getOwner() {
    const { rows } = await db.execute(
      `select value from device_settings where key = 'owner'`,
    );
    return rows[0]?.value ?? null;
  }

  async hasShopData() {
    const { rows } = await db.execute(`select 1 as x from products limit 1`);
    return rows.length > 0;
  }

  async setOwner(ownerID) {
    await db.execute(
      `insert into device_settings (key, value, updated_at) values ('owner', ?, ?)
       on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at`,
      [ownerID, new Date().toISOString()],
    );
  }

  // Local rows only. Nothing is queued: this never deletes anything on Supabase.
  async wipeShop() {
    await db.transaction(async (tx) => {
      for (const table of SHOP_TABLES) await tx.execute(`delete from ${table}`);
      await tx.execute(`delete from device_settings where key != 'owner'`);
    });
  }
}

export default DeviceRepository;
