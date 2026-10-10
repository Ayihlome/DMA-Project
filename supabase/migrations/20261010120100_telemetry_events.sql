-- Telemetry for the evaluation: sale timings and deduction-accuracy checks.
--
-- Rows are append-only from the app's point of view: an owner may insert and
-- read their own events, but never update or delete them, so the measurements
-- behind the report cannot be quietly edited after the fact.
--
-- Safe to re-run: every statement is idempotent.

create table if not exists public.telemetry_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (char_length(type) <= 64),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.telemetry_events enable row level security;

-- Querying by owner and type is what every analysis query in
-- docs/telemetry_queries.sql does
create index if not exists telemetry_events_owner_type_created_idx
  on public.telemetry_events (owner_id, type, created_at desc);

drop policy if exists "Users can insert their own telemetry" on public.telemetry_events;
create policy "Users can insert their own telemetry"
  on public.telemetry_events
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Users can view their own telemetry" on public.telemetry_events;
create policy "Users can view their own telemetry"
  on public.telemetry_events
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

-- No update or delete policies: events are immutable once written. They are
-- removed only by the cascade when the auth user is deleted.
