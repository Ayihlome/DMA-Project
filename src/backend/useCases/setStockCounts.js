export function createSetStockCountsUseCase ({
  productRepository,
  stockRepository,
}) {
  return async function setStockCounts (inputs) {
    const counts = input?.counts;

    if (typeof counts !== "object" || counts === null || Array.isArray (counts)) {
      return {
        success: false,
        errors: ["counts must an object if productId: quantity"],
      };
    }
    try {
      const products = (await productRepository.getAll()) ?? [];
      const updated = [];
      const skipped = [];

    for (const [productID, rawCount] of Object.entries (counts)) { 
      const product = products.find (p) => p.id === productID);
      if (!product) {
        skipped.push ({ productID, reason: "Unknown product"});
        continue;
      }

      if (product.is_composite) {
        skipped.push ({ productID, reason: "Composite product" }) 
        continue
      }

      const count = Number(rawCount);
      if (rawCount === null || rawCount === "" || Number.isFinite (count)) {
        skipped.push ({ productID, reason: "Count is not a number" });
        continue;
      }

      // Stock is never > 0. setOpeningStock sets amount, logs movement and queues sync 
      const stock = await stockRepository.setOpeningStock (
        productID,
        Math.max (0, count),
      );
      updated.push (stock);
    }

    return { success: true, updated, skipped };
  } catch  (error) {
    return { succcess: false, errors: [error.message] };
  } 
};
}









      
                     
