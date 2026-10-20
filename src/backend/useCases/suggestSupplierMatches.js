/**
 * Proposes candidate supplier-catalogue items for each of the shop's products, so the
 * owner can confirm the right one once. That confirmed choice is saved in
 * supplier_product_map, after which the scheduled sync refreshes the price automatically.
 *
 * Category-aware: it matches on the catalogue item's category/vertical and its name, and
 * prefers a similar pack size.
 *
 * Input:
 *   products:  [{ id, name }]
 *   catalogue: [{ id, name, brand, pack, price, category, subCategory, vertical }]
 *   opts:      { limit = 3, minScore = 0.5 }
 * Output:
 *   [{ productId, productName, candidates: [{ externalId, name, pack, price, category, score }] }]
 */
const STOP = new Set(
  "the a an of with for and in to pack ply sheets each value fresh tinned".split(
    " ",
  ),
);
// Colour / size words: useful context but too generic to match on alone.
const ADJ = new Set(
  "white brown red blue green original light low full plain regular small large mega mighty big super".split(
    " ",
  ),
);
const UNIT = /\b\d+[.,]?\d*\s*(kg|g|ml|l|lt|litre|liter|s|pcs|pack|x)\b/gi;

function tokens(s) {
  return String(s || "")
    .toLowerCase()
    .replace(UNIT, " ")
    .replace(/[^a-z ]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

function baseAmount(pack) {
  const m = String(pack || "")
    .toLowerCase()
    .match(/(\d+[.,]?\d*)\s*(kg|g|l|ml)\b/);
  if (!m) return null;
  const n = parseFloat(m[1].replace(",", "."));
  return m[2] === "kg" || m[2] === "l" ? n * 1000 : n; // normalise to g / ml
}

export function createSuggestSupplierMatchesUseCase() {
  return function suggestSupplierMatches({
    products = [],
    catalogue = [],
    opts = {},
  } = {}) {
    const limit = opts.limit ?? 3;
    const minScore = opts.minScore ?? 0.5;

    const index = catalogue.map((it) => ({
      it,
      nameTokens: new Set([...tokens(it.name), ...tokens(it.brand)]),
      catTokens: new Set([
        ...tokens(it.category),
        ...tokens(it.subCategory),
        ...tokens(it.vertical),
      ]),
      amount: baseAmount(it.pack),
    }));

    return products.map((p) => {
      const q = new Set(tokens(p.name));
      const qNouns = [...q].filter((w) => !ADJ.has(w)); // the real subject words
      const qAmount = baseAmount(p.name);

      const scored = [];
      for (const row of index) {
        // Require a genuine subject word in common, not just a colour/size word.
        const sharedNoun = qNouns.some(
          (t) => row.nameTokens.has(t) || row.catTokens.has(t),
        );
        if (!sharedNoun) continue;

        const inName = [...q].filter((t) => row.nameTokens.has(t)).length;
        const inCat = [...q].filter((t) => row.catTokens.has(t)).length;
        let score = (inName + inCat) / Math.max(1, q.size);
        if (inCat) score += 1.0; // category / vertical alignment is a strong signal
        if (qAmount && row.amount) {
          score +=
            0.5 *
            (Math.min(qAmount, row.amount) / Math.max(qAmount, row.amount));
        }
        scored.push({ score: Math.round(score * 100) / 100, it: row.it });
      }

      scored.sort(
        (a, b) =>
          b.score - a.score || (a.it.price ?? 1e9) - (b.it.price ?? 1e9),
      );

      return {
        productId: p.id,
        productName: p.name,
        candidates: scored
          .filter((s) => s.score >= minScore)
          .slice(0, limit)
          .map((s) => ({
            externalId: s.it.id,
            name: s.it.name,
            pack: s.it.pack,
            price: s.it.price,
            category: s.it.category,
            score: s.score,
          })),
      };
    });
  };
}
