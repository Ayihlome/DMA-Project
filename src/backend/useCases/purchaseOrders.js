// Restock orders: planned from the Restock screen, received when the goods arrive,
// cancelled, or undone after "Bought it". Receiving adds stock; undoing takes it back out.

const STATUSES = ["planned", "in_transit", "delivered", "cancelled"];
const PAYMENTS = ["Cash", "Card", "EFT"];

function checkOrder(order) {
  if (!order?.id) return "Order needs an id";
  if (!order.supplierId) return `Order ${order.id} needs a supplier`;
  if (!STATUSES.includes(order.status))
    return `Order ${order.id} has an unknown status`;
  if (order.payment != null && !PAYMENTS.includes(order.payment)) {
    return `Order ${order.id} has an unknown payment`;
  }
  if (!Array.isArray(order.lines) || order.lines.length === 0) {
    return `Order ${order.id} has no lines`;
  }
  for (const line of order.lines) {
    if (!line.productId) return `Order ${order.id} has a line with no product`;
    if (!(line.qty > 0)) return `Order ${order.id} has a line with no quantity`;
    if (!(line.unitPrice >= 0))
      return `Order ${order.id} has a line with no price`;
  }
  return null;
}

/**
 * Saves orders as the screens built them (see Purchase in src/data/types.ts).
 * A delivered order also adds its stock.
 *
 * Input:  { orders: Purchase[] }
 * Output: { success: true, saved: number } | { success: false, errors: string[] }
 */
export function createSavePurchaseOrdersUseCase({ purchaseOrderRepository }) {
  return async function savePurchaseOrders(input) {
    if (!Array.isArray(input?.orders) || input.orders.length === 0) {
      return { success: false, errors: ["orders are required"] };
    }
    const errors = input.orders.map(checkOrder).filter(Boolean);
    if (errors.length) return { success: false, errors };
    try {
      await purchaseOrderRepository.save(input.orders);
      return { success: true, saved: input.orders.length };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * Goods arrived: marks the order delivered and adds its stock.
 *
 * Input:  { id: string, receivedAt?: number }
 * Output: { success: true, changed: boolean } | { success: false, errors: string[] }
 */
export function createReceivePurchaseOrderUseCase({ purchaseOrderRepository }) {
  return async function receivePurchaseOrder(input) {
    if (!input?.id) return { success: false, errors: ["id is required"] };
    try {
      const changed = await purchaseOrderRepository.receive(
        input.id,
        input.receivedAt,
      );
      return { success: true, changed };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * Input:  { id: string }
 * Output: { success: true } | { success: false, errors: string[] }
 */
export function createCancelPurchaseOrderUseCase({ purchaseOrderRepository }) {
  return async function cancelPurchaseOrder(input) {
    if (!input?.id) return { success: false, errors: ["id is required"] };
    try {
      await purchaseOrderRepository.cancel(input.id);
      return { success: true };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}

/**
 * Undo for "Bought it": takes the stock back out and deletes the orders.
 *
 * Input:  { ids: string[] }
 * Output: { success: true } | { success: false, errors: string[] }
 */
export function createUndoPurchaseOrdersUseCase({ purchaseOrderRepository }) {
  return async function undoPurchaseOrders(input) {
    if (!Array.isArray(input?.ids) || input.ids.length === 0) {
      return { success: false, errors: ["ids are required"] };
    }
    try {
      await purchaseOrderRepository.remove(input.ids);
      return { success: true };
    } catch (error) {
      return { success: false, errors: [error.message] };
    }
  };
}
