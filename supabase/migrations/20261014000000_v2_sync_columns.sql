-- Columns and a table the v2 app sends but the earlier migrations did not have.
-- The app's sync queue (src/backend/data/local/syncqueue.js) sends a local row as it is, so
-- every column it sends must exist here, or Supabase rejects the whole row.
-- Safe to re-run: every statement is idempotent.

-- A product's extras (photo, icon, menu group, cost, ...) travel as one json object.
alter table public.products
  add column if not exists meta jsonb not null default '{}'::jsonb;

-- How a sale was paid. cash_given is only set for cash.
alter table public.sales
  add column if not exists payment text check (payment in ('Cash', 'Card', 'EFT'));
alter table public.sales
  add column if not exists cash_given numeric(12, 2) check (cash_given >= 0);

-- The quick-amount keypad ("Other R15") sells money with no product behind it.
alter table public.sale_line_items
  add column if not exists label text;
alter table public.sale_line_items
  alter column product_id drop not null;

-- A voided sale. Sales are an append-only ledger (no update policy), so a void is its own
-- row; the stock it gives back is a normal stock_movements row with reason 'sale_void'.
create table if not exists public.sale_voids (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sale_id uuid not null,
  voided_at timestamptz not null,
  updated_at timestamptz not null default now(),
  unique (sale_id),
  foreign key (sale_id, owner_id) references public.sales (id, owner_id) on delete cascade
);

create index if not exists sale_voids_owner_id_idx on public.sale_voids (owner_id);

alter table public.sale_voids enable row level security;

drop policy if exists "Owners can view their rows" on public.sale_voids;
create policy "Owners can view their rows" on public.sale_voids for select to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can add rows" on public.sale_voids;
create policy "Owners can add rows" on public.sale_voids for insert to authenticated
  with check ((select auth.uid()) = owner_id);
