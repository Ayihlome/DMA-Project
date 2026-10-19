-- Columns the v2 screens write through the sync queue (src/backend/data/local/syncqueue.js).
-- Without them Supabase rejects every product, sale and line item the phone sends, and the
-- rows end up parked as failed after five tries.
-- Safe to re-run: every statement is idempotent.

-- products: the v2-only fields (icon, menu group, cost, sellable...) travel together as one object
alter table public.products add column if not exists meta jsonb not null default '{}'::jsonb;

-- sales: how it was paid, and when it was taken back
alter table public.sales add column if not exists payment text;
alter table public.sales add column if not exists cash_given numeric(12, 2);
alter table public.sales add column if not exists voided_at timestamptz;

alter table public.sales drop constraint if exists sales_payment_check;
alter table public.sales add constraint sales_payment_check
  check (payment is null or payment in ('Cash', 'Card'));

-- sale_line_items: a quick-amount line ("Other R15") has a label and no product behind it
alter table public.sale_line_items add column if not exists label text;
alter table public.sale_line_items alter column product_id drop not null;

alter table public.sale_line_items drop constraint if exists sale_line_items_product_or_label;
alter table public.sale_line_items add constraint sale_line_items_product_or_label
  check (product_id is not null or label is not null);

-- Sales stay an append-only ledger, with one exception: voiding. The owner may set
-- voided_at (and updated_at) on their own sale, and nothing else.
revoke update on public.sales from anon, authenticated;
grant update (voided_at, updated_at) on public.sales to authenticated;

drop policy if exists "Owners can void their sales" on public.sales;
create policy "Owners can void their sales" on public.sales for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);
