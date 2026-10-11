-- Cloud backup: one JSON snapshot of the owner's shop per account.
--
-- This is deliberately a backup, not multi-device sync. One row per owner, the
-- whole AppState upserted as jsonb, last write wins. It carries no foreign keys
-- to the per-entity tables (products, sales, ...) and does not touch them: that
-- schema was built for the SQLite delta sync and is left alone.
--
-- Device photos and the telemetry queue are not included: photos never leave the
-- device by design, and telemetry has its own table.
--
-- The owner_id cascade means delete_own_account() removes this row too, because
-- that function deletes the auth.users row. Nothing extra is needed there.
--
-- Safe to re-run: every statement is idempotent.

create table if not exists public.shop_backups (
  owner_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  state jsonb not null,
  -- Mirrors AppState.version, so a future format change can be migrated or
  -- rejected on restore instead of loading a shape the app cannot read
  schema_version int not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.shop_backups is
  'One jsonb snapshot of each owner''s shop state. Backup only; not multi-device sync.';

alter table public.shop_backups enable row level security;

drop policy if exists "Owners can view their backup" on public.shop_backups;
create policy "Owners can view their backup"
  on public.shop_backups
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists "Owners can create their backup" on public.shop_backups;
create policy "Owners can create their backup"
  on public.shop_backups
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can replace their backup" on public.shop_backups;
create policy "Owners can replace their backup"
  on public.shop_backups
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners can delete their backup" on public.shop_backups;
create policy "Owners can delete their backup"
  on public.shop_backups
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Keep updated_at honest even if a client sends a stale value
drop trigger if exists shop_backups_set_updated_at on public.shop_backups;
create trigger shop_backups_set_updated_at
  before update on public.shop_backups
  for each row execute function private.set_updated_at();
