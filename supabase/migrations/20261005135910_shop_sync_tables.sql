-- Shop data synced up from the app's local SQLite database (backend branch:
-- dma-project/backend/data/local/db.js). Table and column names match the local
-- tables so the sync queue can send a local row as-is.
--
-- Every row belongs to one user through owner_id. Child rows reference their
-- parent by (id, owner_id), so a row can only point at the same owner's data.
--
-- Sales, sale line items and stock movements are an append-only ledger: rows can
-- be inserted and read, never changed or deleted.
--
-- quantity_on_hand in stock_items only changes through stock_movements: insert a
-- movement with a delta and the server applies it. Offline phones send deltas,
-- so two phones selling at once add up instead of overwriting each other.
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  sku text,
  unit text not null,
  is_composite boolean not null default false, -- true = made from a recipe (e.g. a kota)
  selling_price numeric(12, 2) check (selling_price >= 0),
  category text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  unique (id, owner_id)
);

create index if not exists products_owner_id_idx on public.products (owner_id);

-- ---------------------------------------------------------------------------
-- recipe_components: what one composite product uses up when it's sold
-- ---------------------------------------------------------------------------
create table if not exists public.recipe_components (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  parent_product_id uuid not null,
  component_product_id uuid not null,
  quantity_required numeric not null check (quantity_required > 0),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  check (parent_product_id <> component_product_id),
  foreign key (parent_product_id, owner_id) references public.products (id, owner_id) on delete cascade,
  foreign key (component_product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists recipe_components_owner_id_idx on public.recipe_components (owner_id);
create index if not exists recipe_components_parent_idx on public.recipe_components (parent_product_id);
create index if not exists recipe_components_component_idx on public.recipe_components (component_product_id);

-- ---------------------------------------------------------------------------
-- stock_items: current stock per product
-- ---------------------------------------------------------------------------
create table if not exists public.stock_items (
  product_id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- no ">= 0" check: a phone selling offline can oversell, and the sale still happened
  quantity_on_hand numeric not null default 0,
  reorder_point numeric check (reorder_point >= 0),
  last_restocked_at timestamptz,
  updated_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists stock_items_owner_id_idx on public.stock_items (owner_id);

-- ---------------------------------------------------------------------------
-- stock_movements: every change to stock (sale deductions, restocks, counts)
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null,
  delta numeric not null,
  resulting_quantity numeric, -- set by the server from its own stock_items total
  reason text not null, -- e.g. 'sale_deduction', 'restock'
  created_at timestamptz not null default now(),
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists stock_movements_owner_id_idx on public.stock_movements (owner_id);
create index if not exists stock_movements_product_time_idx on public.stock_movements (product_id, created_at);

-- ---------------------------------------------------------------------------
-- sales and their line items
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  "timestamp" timestamptz not null,
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create index if not exists sales_owner_time_idx on public.sales (owner_id, "timestamp" desc);

create table if not exists public.sale_line_items (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sale_id uuid not null,
  product_id uuid not null,
  quantity_sold numeric not null check (quantity_sold > 0),
  price_at_sale numeric(12, 2) not null check (price_at_sale >= 0),
  updated_at timestamptz not null default now(),
  foreign key (sale_id, owner_id) references public.sales (id, owner_id) on delete cascade,
  -- products are soft-deleted (is_deleted), so a sold product is never removed
  foreign key (product_id, owner_id) references public.products (id, owner_id)
);

create index if not exists sale_line_items_owner_id_idx on public.sale_line_items (owner_id);
create index if not exists sale_line_items_sale_id_idx on public.sale_line_items (sale_id);
create index if not exists sale_line_items_product_id_idx on public.sale_line_items (product_id);

-- ---------------------------------------------------------------------------
-- kpi_snapshots: latest computed numbers per product
-- ---------------------------------------------------------------------------
create table if not exists public.kpi_snapshots (
  id uuid primary key,
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null unique,
  sales_velocity numeric,
  days_of_stock_remaining numeric,
  stockout_frequency numeric,
  turnover_rate numeric,
  computed_at timestamptz not null,
  foreign key (product_id, owner_id) references public.products (id, owner_id) on delete cascade
);

create index if not exists kpi_snapshots_owner_id_idx on public.kpi_snapshots (owner_id);

-- ---------------------------------------------------------------------------
-- Row Level Security: each user sees and changes only their own rows
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.recipe_components enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.sales enable row level security;
alter table public.sale_line_items enable row level security;
alter table public.kpi_snapshots enable row level security;

-- Editable tables: full access to your own rows
do $$
declare
  t text;
begin
  foreach t in array array['products', 'recipe_components', 'stock_items', 'kpi_snapshots'] loop
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

-- Ledger tables: insert and read only
do $$
declare
  t text;
begin
  foreach t in array array['sales', 'sale_line_items', 'stock_movements'] loop
    execute format('drop policy if exists "Owners can view their rows" on public.%I', t);
    execute format(
      'create policy "Owners can view their rows" on public.%I for select to authenticated
         using ((select auth.uid()) = owner_id)', t);

    execute format('drop policy if exists "Owners can add rows" on public.%I', t);
    execute format(
      'create policy "Owners can add rows" on public.%I for insert to authenticated
         with check ((select auth.uid()) = owner_id)', t);
  end loop;
end;
$$;

-- The app may set reorder points and restock dates directly, but not the stock
-- total itself: that only moves through stock_movements (trigger below).
revoke update on public.stock_items from anon, authenticated;
grant update (reorder_point, last_restocked_at, updated_at) on public.stock_items to authenticated;

-- ---------------------------------------------------------------------------
-- Apply each stock movement to stock_items
-- ---------------------------------------------------------------------------
-- Runs before the row's RLS check; if that check or the product foreign key
-- fails, the whole insert (and this update) is rolled back.
create or replace function private.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.stock_items as s (product_id, owner_id, quantity_on_hand, updated_at)
  values (new.product_id, new.owner_id, new.delta, now())
  on conflict (product_id) do update
    set quantity_on_hand = s.quantity_on_hand + excluded.quantity_on_hand,
        updated_at = now()
    where s.owner_id = excluded.owner_id
  returning s.quantity_on_hand into new.resulting_quantity;

  if not found then
    raise exception 'Product % does not belong to this user', new.product_id
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function private.apply_stock_movement() from public, anon, authenticated;

drop trigger if exists stock_movements_apply on public.stock_movements;
create trigger stock_movements_apply
  before insert on public.stock_movements
  for each row execute function private.apply_stock_movement();
