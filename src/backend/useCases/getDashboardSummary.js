/**
 * Powers the Today screen.
 *
 * Input:  { ownerID?: string, now?: number }   // now = ms timestamp, for tests
 * Output: {
 *   salesToday: number,
 *   salesYesterday: number,          // yesterday up to this time of day
 *   itemCount: number,               // stock items (made-to-order products not counted)
 *   stockValue: number,              // stock on hand x cheapest saved supplier price
 *   restockCount: number,            // items on the restock list
 *   soonestStockoutDays: number|null // 0 = something is out, null = nothing is low
 *   lowStock: [{                     // most urgent first
 *     productID, name, category, unit,
 *     stockOnHand: number,
 *     daysOfStockRemaining: number | null,
 *     level: 'out-soon' | 'low',     // 'out-soon' = none left or gone within a day
 *   }],
 * }
 *
 * "Low" follows the restock engine: 7 days of stock or less. Refreshes the KPI snapshots.
 */

const DAY = 86_400_000;
const LOW_DAYS = 7;
const OUT_SOON_DAYS = 1;

export function createGetDashboardSummaryUseCase({
  kpiCalculator,
  productRepository,
  stockRepository,
  saleRepository,
  supplierPriceRepository,
  generateRestockPlan,
}) {
  return async function getDashboardSummary(input = {}) {
    const now = input.now ?? Date.now();
    const startOfToday = new Date(now).setHours(0, 0, 0, 0);
    const iso = (t) => new Date(t).toISOString();

    const products = (await productRepository.getAll()).filter(
      (p) => !p.is_composite,
    );

    const snapshots = await Promise.all(
      products.map((p) => kpiCalculator.generateSnapshot(p.id)),
    );
    const daysOf = new Map(
      snapshots.map((s) => [s.productID, s.daysOfStockRemaining ?? null]),
    );

    const [salesToday, salesYesterday, plan, rows] = await Promise.all([
      saleRepository.getSalesTotal(iso(startOfToday), iso(now + 1)),
      saleRepository.getSalesTotal(iso(startOfToday - DAY), iso(now - DAY)),
      generateRestockPlan({ budget: 0, refreshSnapshots: false }),
      Promise.all(
        products.map(async (p) => {
          const stock = await stockRepository.getStockByProductId(p.id);
          const stockOnHand = Number(stock?.quantityOnHand) || 0;
          const prices = await supplierPriceRepository.getPricesByProductId(
            p.id,
          );
          const cheapest = prices.length
            ? Math.min(...prices.map((x) => Number(x.unit_price) || 0))
            : 0;
          return {
            product: p,
            stockOnHand,
            days: daysOf.get(p.id) ?? null,
            value: stockOnHand * cheapest,
          };
        }),
      ),
    ]);

    const urgency = (r) => (r.stockOnHand <= 0 ? -1 : (r.days ?? Infinity));
    const low = rows
      .filter(
        (r) => r.stockOnHand <= 0 || (r.days != null && r.days <= LOW_DAYS),
      )
      .sort((a, b) => urgency(a) - urgency(b));

    return {
      salesToday,
      salesYesterday,
      itemCount: products.length,
      stockValue: Math.round(rows.reduce((t, r) => t + r.value, 0) * 100) / 100,
      restockCount: plan.recommendations.length,
      soonestStockoutDays: low.length
        ? low[0].stockOnHand <= 0
          ? 0
          : low[0].days
        : null,
      lowStock: low.map((r) => ({
        productID: r.product.id,
        name: r.product.name,
        category: r.product.category ?? null,
        unit: r.product.unit,
        stockOnHand: r.stockOnHand,
        daysOfStockRemaining: r.days,
        level:
          r.stockOnHand <= 0 || (r.days != null && r.days <= OUT_SOON_DAYS)
            ? "out-soon"
            : "low",
      })),
    };
  };
}
