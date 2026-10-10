class Product {
  constructor({
    id,
    name,
    sku,
    unit,
    sellingPrice,
    category,
    isComposite,
    packSize,
    openingStock,
  }) {
    Object.assign(this, {
      id,
      name,
      sku,
      unit,
      sellingPrice,
      category,
      is_composite: isComposite,
      packSize,
      openingStock,
    });
  }

  isComposite() {
    return this.is_composite;
  }
}

class StockItem {
  constructor(productId, quantity) {
    this.productId = productId;
    this.quantity = quantity;
    this.lastRestock = 0; // datatime or days
  }
}

module.exports = StockItem;
module.exports = Product;
