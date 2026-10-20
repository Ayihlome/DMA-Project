-- Maps one of a shop's own products to an item in an external supplier catalogue
-- (e.g. a Makro product id), so a scheduled sync can refresh that product's price
-- automatically. The owner confirms each mapping once; the sync does the rest.
-- Owner-scoped RLS, same shape as suppliers/supplier_prices. Safe to re-run.

create table if not exists public.supplier_product_map (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  supplier_id uuid not null,
  product_id uuid not null,
  external_source text not null,                 -- e.g. 'makro'
  external_id text not null,                      -- the supplier catalogue's product id
  external_name text,                             -- name at mapping time (display / audit)
  updated_at timestamptz not null default now(),
  unique (supplier_id, product_id),
  foreign key (supplier_id, owner_id) references public.suppliers (id, owner_id) on delete cascade,
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists supplier_product_map_owner_idx on public.supplier_product_map (owner_id);
create index if not exists supplier_product_map_lookup_idx on public.supplier_product_map (external_source, external_id);

alter table public.supplier_product_map enable row level security;

do $$ begin
  drop policy if exists "Owners can view their rows" on public.supplier_product_map;
  create policy "Owners can view their rows" on public.supplier_product_map for select to authenticated
    using ((select auth.uid()) = owner_id);
  drop policy if exists "Owners can add rows" on public.supplier_product_map;
  create policy "Owners can add rows" on public.supplier_product_map for insert to authenticated
    with check ((select auth.uid()) = owner_id);
  drop policy if exists "Owners can update their rows" on public.supplier_product_map;
  create policy "Owners can update their rows" on public.supplier_product_map for update to authenticated
    using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
  drop policy if exists "Owners can delete their rows" on public.supplier_product_map;
  create policy "Owners can delete their rows" on public.supplier_product_map for delete to authenticated
    using ((select auth.uid()) = owner_id);
end $$;

-- Let the scheduled sync (service_role) insert prices without supplying a primary key.
alter table public.supplier_prices alter column id set default gen_random_uuid();