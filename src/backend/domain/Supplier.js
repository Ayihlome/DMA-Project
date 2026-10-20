class Suppliers {
  constructor({
    id,
    name,
    contact,
    location,
    sourceType,
    sourceUrl,
    lastSyncedAt,
  }) {
    Object.assign(this, {
      id,
      name,
      contact,
      location,
      sourceType: sourceType ?? "manual",
      sourceUrl: sourceUrl ?? null,
      lastSyncedAt: lastSyncedAt ?? null,
    });
  }
}

// This class is like a composite class between the Product and Supplier class
// Used for comparing suppliers in the restock engine
class SupplierPrice {
  constructor(supplier, product, price, minimum_order) {
    this.supplier = supplier;
    this.product = product;
    this.unitPrice = price;
    this.minimumOrder = minimum_order;
  }
}

module.exports = SupplierPrice;
module.exports = Suppliers;
