class Sale {
  constructor(saleID, items) {
    this.saleID = saleID;
    this.items = items; // a list of dictionary items of each product being sold [{productId: "KOTA",quantity: 3,priceAtSale: 35.00}]
    this.timestamp = Date.now();
  }
}

module.exports = Sale;
