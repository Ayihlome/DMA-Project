class RecipeComponent {
  constructor({ id, parentProductID, componentProductID, quantityRequired }) {
    Object.assign(this, {
      id,
      parentProductID,
      componentProductID,
      quantityRequired,
    });
  }
}

module.exports = RecipeComponent;
