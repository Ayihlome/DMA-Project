import { db } from "../data/local/db";
import { enqueueSync } from "../data/local/syncqueue";

class SupplierRepository {
  async create(supplier) {
    const now = new Date().toISOString();

    await db.execute(
      `insert into suppliers (id, name, contact, location, updated_at, is_deleted) values (?, ?, ?, ?, ?, 0)`,
      [supplier.id, supplier.name, supplier.contact, supplier.location, now],
    );

    await enqueueSync("suppliers", supplier.id, "insert", supplier);
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
