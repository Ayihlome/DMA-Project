class RecipeComponent {
  constructor(productID, compProductID, quantity) {
    this.productID = productID; // the main product e,g Kota 3
    this.compProductID = compProductID; // ingredient
    this.quantity = quantity;
  }
}

module.exports = RecipeComponent;
