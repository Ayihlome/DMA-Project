class RecipeComponent {
  constructor(productID, componentProductID, quantity) {
    this.productID = productID; // the main product e,g Kota 3
    this.componentProductID = componentProductID; // ingredient
    this.quantityRequired = quantity;
  }
}

module.exports = RecipeComponent;
