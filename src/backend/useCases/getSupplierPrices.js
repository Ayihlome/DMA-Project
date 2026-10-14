/**
 * Powers the Supplier prices screen: every saved price for one product, cheapest first.
 *
 * Input:  { productID: string }
 * Output: [{
 *   supplierID: string,
 *   supplierName: string,
 *   location: string | null,
 *   unitPrice: number,
 *   minimumOrder: number | null,
 * }]
 */

export function createGetSupplierPricesUseCase({
  supplierPriceRepository,
  supplierRepository,
}) {
  return async function getSupplierPrices(input) {
    if (!input?.productID) return [];

    const [prices, suppliers] = await Promise.all([
      supplierPriceRepository.getPricesByProductId(input.productID),
      supplierRepository.getAll(),
    ]);
    const locationOf = new Map(
      suppliers.map((s) => [s.id, s.location ?? null]),
    );

    return prices
      .map((row) => ({
        supplierID: row.supplier_id,
        supplierName: row.supplier_name,
        location: locationOf.get(row.supplier_id) ?? null,
        unitPrice: Number(row.unit_price),
        minimumOrder:
          row.min_order_qty == null ? null : Number(row.min_order_qty),
      }))
      .sort((a, b) => a.unitPrice - b.unitPrice);
  };
}
