class Product {
  constructor(productID, name, units, sellingPrice, type) {
    this.productID = productID;
    this.productName = name;
    this.sellingPrice = sellingPrice;
    this.units = units;
    this.type = type; // is it a single product item or composite
  }

  isComposite() {
    return this.type;
  }
}

class StockItem {
  constructor(productId, quantity) {
    this.productId = productId;
    this.quantity = quantity;
    this.lastRestock = 0; // datatime or days
  }

  deduct(amount) {
    if (amount > this.quantity) {
      throw new Error("Insufficient stock");
    }

    this.quantity -= amount;
  }
}
