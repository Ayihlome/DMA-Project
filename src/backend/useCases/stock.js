export function createReceiveStockUseCase({ stockRepository }) {
  return async function receiveStock(input) {
    if (
      !input.productID ||
      !Number.isFinite(input.quantity) ||
      input.quantity <= 0
    ) {
      return {
        success: false,
        errors: ["productID and a positive quantity are required"],
      };
    }

    try {
      const stock = await stockRepository.receiveStock(
        input.productID,
        input.quantity,
      );
      return { success: true, stock };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

export function createSetOpeningStockUseCase({ stockRepository }) {
  return async function setOpeningStock(input) {
    if (
      !input.productID ||
      !Number.isFinite(input.quantity) ||
      input.quantity < 0
    ) {
      return {
        success: false,
        errors: ["productID and a non-negative quantity are required"],
      };
    }

    try {
      const stock = await stockRepository.setOpeningStock(
        input.productID,
        input.quantity,
      );
      return { success: true, stock };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
