/**
 *
 * Input:  { ownerID: string }
 * Output: KPISnapshot[] — one per non-deleted product
 *
 * NOTE: recomputes every product's KPIs on every call. Fine for a shop with
 * a modest catalogue; if the product count grows large enough that this is
 * visibly slow on the Dashboard, the fix is caching against `computed_at`
 * (skip recompute if a snapshot is younger than e.g. 5 minutes) — don't add
 * that complexity until it's actually needed.
 */

export function createGetDashboardKpiUseCase({
  kpiCalculator,
  productRepository,
}) {
  return async function getDashboardKpis(input) {
    const products = await productRepository.getAll();
    const snapshots = [];

    const snapshot = await Promise.all(
      products
        .filter((p) => !p.is_composite)
        .map((p) => kpiCalculator.generateSnapshot(p.id)),
    );
    snapshots.push(snapshot);

    return snapshots;
  };
}
