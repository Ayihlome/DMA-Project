import { voidSale } from "@/data/actions";
import { db } from "../data/local/db";

// Reads the whole shop in one go for loadShop. Read-only: nothing here writes or queues.
class ShopReadRepository {
  async products() {
    const { rows } = await db.execute(
      `select p.*, coalesce(s.quantity_on_hand, 0) as quantity_on_hand
       from products p left join stock_items s on s.product_id = p.id
       where p.is_deleted = 0
       order by p.created_at, p.rowid`,
    );
    return rows;
  }

  async recipeComponents() {
    const { rows } = await db.execute(
      `select parent_product_id, component_product_id, quantity_required
       from recipe_components where is_deleted = 0 order by rowid`,
    );
    return rows;
  }

  async suppliers() {
    const { rows } = await db.execute(
      `select id, name, contact, location from suppliers where is_deleted = 0 order by rowid`,
    );
    return rows;
  }

  async supplierPrices() {
    const { rows } = await db.execute(
      `select id, supplier_id, product_id, unit_price, minimum_order, updated_at
       from supplier_prices order by rowid`,
    );
    return rows;
  }

  async sales() {
    const { rows } = await db.execute(
      `select id, "timestamp", total_amount, payment, cash_given from sales where voided_at is null order by "timestamp", rowid`,
    );
    return rows;
  }

  async voidSale() {
    const { rows } =
      await db.execute(`select id, "timestamp", total_amount, payment, cash_given, voided_at
       from sales where voided_at is not null order by voided_at, rowid`);
    return rows;
  }

  async saleLines() {
    const { rows } = await db.execute(
      `select sale_id, product_id, label, quantity_sold, price_at_sale from sale_line_items order by rowid`,
    );
    return rows;
  }

  async settings() {
    const { rows } = await db.execute(`select key, value from device_settings`);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async unsyncedOps() {
    const { rows } = await db.execute(
      `select id, entity_type, operation, created_at, retry_count
       from sync_queue where status != 'synced' order by created_at, rowid`,
    );
    return rows;
  }

  async lastSyncedAt() {
    const { rows } = await db.execute(
      `select max(synced_at) as at from sync_queue`,
    );
    return rows[0]?.at ?? null;
  }
}

export default ShopReadRepository;
