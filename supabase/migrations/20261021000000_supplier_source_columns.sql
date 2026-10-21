-- Where a supplier's prices come from, and how fresh they are. Phase 1 of the
-- supplier-profile feature. Everything here is optional, so existing manual
-- suppliers and prices are untouched (source_type defaults to 'manual').
-- The sync queue sends local rows as-is, so these columns must exist here or
-- Supabase rejects the whole row.
-- Safe to re-run: every statement is idempotent.

alter table public.suppliers
  add column if not exists source_type text not null default 'manual'
    check (source_type in ('manual', 'csv', 'web_catalogue', 'partner_api'));
alter table public.suppliers
  add column if not exists source_url text;
alter table public.suppliers
  add column if not exists last_synced_at timestamptz;

-- A price now remembers the day it is valid for (a leaflet's date, or when it
-- was keyed in) and where it came from, so the profile can show its freshness.
alter table public.supplier_prices
  add column if not exists as_of date;
alter table public.supplier_prices
  add column if not exists source text;