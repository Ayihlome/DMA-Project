-- Suppliers and the prices they quote, synced up from the app's local SQLite database
-- (src/backend/data/local/db.js). Same rules as the other shop tables: every row belongs to
-- one user through owner_id, child rows point at the same owner's parents, and row level
-- security lets a user see and change only their own rows.
-- Safe to re-run: every statement is idempotent.

create table if not exists public.suppliers (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  contact text,
  location text,
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  unique (id, owner_id)
);

create index if not exists suppliers_owner_id_idx on public.suppliers (owner_id);

create table if not exists public.supplier_prices (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null,
  product_id uuid not null,
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  minimum_order numeric check (minimum_order >= 0),
  updated_at timestamptz not null default now(),
  -- one price per supplier and product; a repeat price replaces the old one (upsert)
  unique (supplier_id, product_id),
  foreign key (supplier_id, owner_id) references public.suppliers (id, owner_id) on delete cascade,
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists supplier_prices_owner_id_idx on public.supplier_prices (owner_id);
create index if not exists supplier_prices_product_idx on public.supplier_prices (product_id);

alter table public.suppliers enable row level security;
alter table public.supplier_prices enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['suppliers', 'supplier_prices'] loop
    execute format('drop policy if exists "Owners can view their rows" on public.%I', t);
    execute format(
      'create policy "Owners can view their rows" on public.%I for select to authenticated
         using ((select auth.uid()) = owner_id)', t);

    execute format('drop policy if exists "Owners can add rows" on public.%I', t);
    execute format(
      'create policy "Owners can add rows" on public.%I for insert to authenticated
         with check ((select auth.uid()) = owner_id)', t);

    execute format('drop policy if exists "Owners can update their rows" on public.%I', t);
    execute format(
      'create policy "Owners can update their rows" on public.%I for update to authenticated
         using ((select auth.uid()) = owner_id)
         with check ((select auth.uid()) = owner_id)', t);

    execute format('drop policy if exists "Owners can delete their rows" on public.%I', t);
    execute format(
      'create policy "Owners can delete their rows" on public.%I for delete to authenticated
         using ((select auth.uid()) = owner_id)', t);
  end loop;
end;
$$;