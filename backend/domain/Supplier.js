class Suppliers {
  constructor(name, contact, location) {
    this.supplierName = name;
    this.contact = contact;
    this.location = location;
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
