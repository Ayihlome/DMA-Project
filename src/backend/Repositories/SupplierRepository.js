import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class SupplierRepository {
  async create(supplier) {
    const now = new Date().toISOString();

    await db.execute(
      `insert into suppliers (id, name, contact, location, updated_at, is_deleted) values (?, ?, ?, ?, ?, 0)`,
      [supplier.id, supplier.name, supplier.contact, supplier.location, now],
    );

    await enqueueSync("suppliers", supplier.id, "insert", {
      id: supplier.id,
      name: supplier.name,
      contact: supplier.contact ?? null,
      location: supplier.location ?? null,
      updated_at: now,
      is_deleted: false,
    });
    return supplier;
  }

  async getAll() {
    const { rows } = await db.execute(
      `select * from suppliers where is_deleted = 0`,
    );
    return rows;
  }
}

export default SupplierRepository;
