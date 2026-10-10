-- POPIA: let an owner delete their own account from inside the app.
--
-- Deleting from auth.users normally needs the service role key. That key must
-- never ship in the app, because anyone could extract it from the bundle and
-- delete or read every account. Instead this security definer function runs
-- with the privileges of its owner but hard-codes the target to auth.uid(), so
-- a caller can only ever delete themselves. It takes no arguments, which means
-- there is no parameter for a caller to tamper with.
--
-- Everything the owner has (profile, shop rows, telemetry) is removed by the
-- `on delete cascade` on each table's auth.users reference.
--
-- Safe to re-run: every statement is idempotent.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  -- An anonymous or expired caller has no uid; refuse rather than delete nothing silently
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;

  delete from auth.users where id = uid;
end;
$$;

-- Only a signed-in user may call it; anon has no business here
revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
