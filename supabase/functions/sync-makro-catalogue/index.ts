// Supabase function that syncs Makro prices
//Weekly job: Reads a hosted Makro catalogue snapshot (JSON), then for every owner-confirmed mapping in supplier_product_map (external_source = 'makro') it
// refreshes that product's supplier_prices row with the latest price, stamped with the catalogue's validity date as `as_of`.
import { createClient } from "jsr:@supabase/supabase-js@2";

type SnapItem = { id: string; name: string; price: number | null; pack?: string | null };
type Snapshot = { source: string; catalogue: string; valid_until: string; items: SnapItem[] };

Deno.serve(async () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const snapshotUrl = Deno.env.get("MAKRO_SNAPSHOT_URL");
  if (!snapshotUrl) return json({ ok: false, error: "MAKRO_SNAPSHOT_URL not set" }, 500);

  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // 1. Pull the hosted snapshot.
  const res = await fetch(snapshotUrl);
  if (!res.ok) return json({ ok: false, error: `snapshot fetch ${res.status}` }, 502);
  const snap = (await res.json()) as Snapshot;
  const priceById = new Map(snap.items.map((it) => [it.id, it]));
  const asOf = snap.valid_until;                         // date these prices are valid as of
  const source = `${snap.source} ${snap.catalogue}`;

  // 2. Every owner-confirmed Makro mapping, across all shops.
  const { data: maps, error } = await supabase
    .from("supplier_product_map")
    .select("owner_id, supplier_id, product_id, external_id")
    .eq("external_source", "makro");
  if (error) return json({ ok: false, error: error.message }, 500);

  // 3. Build the price rows (only where the catalogue still has that item + a price).
  const now = new Date().toISOString();
  const rows: Record<string, unknown>[] = [];
  let missing = 0;
  for (const m of maps ?? []) {
    const item = priceById.get(m.external_id);
    if (!item || item.price == null) { missing++; continue; }
    rows.push({
      owner_id: m.owner_id,
      supplier_id: m.supplier_id,
      product_id: m.product_id,
      unit_price: item.price,          // NOTE: Makro's pack price. Per-unit normalisation
                                       // (divide by pack size) is a later refinement.
      minimum_order: null,
      updated_at: now,
      as_of: asOf,
      source,
    });
  }

  // 4. Upsert prices (unique on supplier_id, product_id; id has a DB default now).
  let updated = 0;
  if (rows.length) {
    const { error: upErr, count } = await supabase
      .from("supplier_prices")
      .upsert(rows, { onConflict: "supplier_id,product_id", count: "exact" });
    if (upErr) return json({ ok: false, error: upErr.message }, 500);
    updated = count ?? rows.length;
  }

  // 5. Stamp each touched supplier as freshly synced (drives the freshness badge).
  const supplierIds = [...new Set(rows.map((r) => r.supplier_id as string))];
  if (supplierIds.length) {
    await supabase.from("suppliers").update({ last_synced_at: now }).in("id", supplierIds);
  }

  return json({ ok: true, catalogue: snap.catalogue, as_of: asOf, mappings: maps?.length ?? 0, updated, missing });
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}