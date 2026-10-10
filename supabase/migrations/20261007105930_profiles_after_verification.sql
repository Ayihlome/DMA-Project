-- Only verified users become app users.
--
-- Supabase Auth has to keep an account in auth.users while it waits for the
-- emailed code; that can't be avoided. Such an account can't sign in, so it has
-- no session and RLS gives it no data. This migration:
--   1. creates the profile when the email is verified, not at sign-up, so the
--      app's own tables only ever hold verified users;
--   2. deletes accounts that were never verified within 24 hours (the code
--      expires after 1 hour, so these are abandoned sign-ups).
-- Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- 1. Profile on verification
-- ---------------------------------------------------------------------------
-- handle_new_user() itself is unchanged (it copies the full_name sent by the
-- register screen); only when it fires changes.

-- Accounts that are already verified when they are created (e.g. made in the
-- dashboard with "auto confirm") still get a profile straight away
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  when (new.email_confirmed_at is not null)
  execute function private.handle_new_user();

-- Everyone else gets one the moment their code is accepted
drop trigger if exists on_auth_user_verified on auth.users;
create trigger on_auth_user_verified
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function private.handle_new_user();

-- Remove profiles the old trigger made for accounts that never verified
delete from public.profiles p
using auth.users u
where u.id = p.id
  and u.email_confirmed_at is null;

-- ---------------------------------------------------------------------------
-- 2. Nightly clean-up of abandoned sign-ups
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;

create or replace function private.delete_unverified_users()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  -- Never verified and older than a day; their sessions, identities and any
  -- app rows go with them (on delete cascade)
  delete from auth.users
  where email_confirmed_at is null
    and created_at < now() - interval '24 hours';
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function private.delete_unverified_users() from public, anon, authenticated;

-- Every night at 03:00 UTC (05:00 in South Africa). Re-running replaces the job.
select cron.schedule(
  'delete-unverified-users',
  '0 3 * * *',
  'select private.delete_unverified_users()'
);