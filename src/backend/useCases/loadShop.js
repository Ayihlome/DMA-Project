/**
 * Input: none
 * Output: AppState (see src/data/types.ts)
 *
 * Not wrapped in withLogging: it runs on every refresh and returns every row.
 */
import { QUICK_AMOUNT_ID } from "./recordSale";

const json = (text, fallback) => {
  try {
    return text == null ? fallback : JSON.parse(text);
  } catch {
    return fallback;
  }
};
const ms = (iso) => (iso ? Date.parse(iso) || 0 : 0);

const ENTITY = {
  sales: "sale",
  sale_line_items: "sale",
  stock_movements: "stock",
  purchases: "purchase",
  supplier_prices: "supplier_price",
  profiles: "profile",
};

export function createLoadShopUseCase({ shopReadRepository: repo }) {
  return async function loadShop() {
    const [
      products,
      parts,
      suppliers,
      prices,
      sales,
      voided,
      lines,
      settings,
      ops,
      syncedAt,
    ] = await Promise.all([
      repo.products(),
      repo.recipeComponents(),
      repo.suppliers(),
      repo.supplierPrices(),
      repo.sales(),
      repo.voidedSales(),
      repo.saleLines(),
      repo.settings(),
      repo.unsyncedOps(),
      repo.lastSyncedAt(),
    ]);

    const recipes = new Map();
    for (const c of parts) {
      const list = recipes.get(c.parent_product_id) ?? [];
      list.push({
        productId: c.component_product_id,
        qty: Number(c.quantity_required),
      });
      recipes.set(c.parent_product_id, list);
    }

    const linesBySale = new Map();
    for (const l of lines) {
      const list = linesBySale.get(l.sale_id) ?? [];
      list.push({
        productId: l.product_id ?? QUICK_AMOUNT_ID,
        qty: Number(l.quantity_sold),
        price: Number(l.price_at_sale),
        ...(l.product_id ? {} : { label: l.label ?? "Other" }),
      });
      linesBySale.set(l.sale_id, list);
    }
    const toSale = (s) => ({
      id: s.id,
      at: ms(s.timestamp),
      lines: linesBySale.get(s.id) ?? [],
      total: Number(s.total_amount),
      ...(s.payment ? { payment: s.payment } : {}),
      ...(s.cash_given != null ? { cashGiven: Number(s.cash_given) } : {}),
    });

    return {
      version: 1,
      products: products.map((row) => {
        const m = json(row.meta, {});
        const price = Number(row.selling_price) || 0;
        const packSize = Number(row.pack_size) || 1;
        return {
          id: row.id,
          name: row.name,
          detail: m.detail ?? "",
          category: row.category ?? "other",
          icon: m.icon ?? "inventory_2",
          ...(m.image ? { image: m.image } : {}),
          sellable: m.sellable ?? price > 0,
          price,
          cost: Number(m.cost) || 0,
          unit: row.unit,
          unitPlural: m.unitPlural ?? row.unit,
          stock: Number(row.quantity_on_hand) || 0,
          packSize,
          packLabel: m.packLabel ?? `pack of ${packSize}`,
          ...(row.is_composite
            ? { composite: true, recipe: recipes.get(row.id) ?? [] }
            : {}),
          ...(m.family ? { family: m.family } : {}),
          ...(m.menu ? { menu: m.menu } : {}),
          ...(m.variant ? { variant: m.variant } : {}),
          ...(m.size ? { size: m.size } : {}),
          ...(m.priceOptions ? { priceOptions: m.priceOptions } : {}),
          ...(m.untracked ? { untracked: true } : {}),
          ...(row.sold_without_recipe > 0
            ? { soldWithoutRecipe: Number(row.sold_without_recipe) }
            : {}),
        };
      }),
      suppliers: suppliers.map((s) => ({
        id: s.id,
        name: s.name ?? "",
        ...(s.location ? { location: s.location } : {}),
        ...(s.contact ? { contact: s.contact } : {}),
      })),
      prices: prices.map((p) => ({
        id: p.id,
        supplierId: p.supplier_id,
        productId: p.product_id,
        unitPrice: Number(p.unit_price),
        ...(p.minimum_order != null
          ? { minOrder: Number(p.minimum_order) }
          : {}),
        updatedAt: ms(p.updated_at),
        // no price history table yet: one point, so "vs last month" stays empty
        history: [{ at: ms(p.updated_at), price: Number(p.unit_price) }],
      })),
      sales: sales.map(toSale),
      voidedSales: voided.map((s) => ({
        ...toSale(s),
        voidedAt: ms(s.voided_at),
      })),
      purchases: [], // filled by the order use cases (createOrderList / receivePurchase / cancelPurchase)
      preferred: json(settings.preferred, {}),
      budget: Number(settings.budget) || 0,
      profile: json(settings.profile, {
        ownerName: "",
        storeName: "",
        role: "Owner",
        memberSince: Date.now(),
      }),
      queue: ops.map((o) => ({
        id: o.id,
        entity: ENTITY[o.entity_type] ?? "product",
        op: o.operation === "insert" ? "create" : "update",
        at: ms(o.created_at),
        status: "pending",
        retries: Number(o.retry_count) || 0,
      })),
      lastSyncedAt: ms(syncedAt),
      onboardedAt: json(settings.onboardedAt, null),
      ...(settings.sellGrid
        ? { sellGrid: json(settings.sellGrid, undefined) }
        : {}),
    };
  };
}
