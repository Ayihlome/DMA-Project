import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

/**
 * The owner-confirmed link between a shop product and an external catalogue item
 * (e.g. a Makro product id). Written when the owner confirms a match; read by the
 * scheduled price sync. Synced up like the other shop tables.
 */
class SupplierProductMapRepository {
  async upsert(map) {
    const now = new Date().toISOString();
    const id = map.id ?? crypto.randomUUID();
    await db.execute(
      `insert into supplier_product_map
         (id, supplier_id, product_id, external_source, external_id, external_name, updated_at)
       values (?, ?, ?, ?, ?, ?, ?)
       on conflict(supplier_id, product_id) do update set
         external_source = excluded.external_source,
         external_id = excluded.external_id,
         external_name = excluded.external_name,
         updated_at = excluded.updated_at`,
      [
        id,
        map.supplierID,
        map.productID,
        map.externalSource,
        map.externalID,
        map.externalName ?? null,
        now,
      ],
    );
    const { rows } = await db.execute(
      `select id from supplier_product_map where supplier_id = ? and product_id = ?`,
      [map.supplierID, map.productID],
    );
    const rowId = rows[0].id;

    await enqueueSync("supplier_product_map", rowId, "upsert", {
      id: rowId,
      supplier_id: map.supplierID,
      product_id: map.productID,
      external_source: map.externalSource,
      external_id: map.externalID,
      external_name: map.externalName ?? null,
      updated_at: now,
    });

    return { ...map, id: rowId, updatedAt: now };
  }

  async getAll() {
    const { rows } = await db.execute(`select * from supplier_product_map`);
    return rows;
  }
}

export default SupplierProductMapRepository;
