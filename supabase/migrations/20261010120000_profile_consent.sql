-- POPIA: record when the owner agreed to the privacy notice.
--
-- The profile row is only created once the email is verified (see
-- 20261007105930_profiles_after_verification.sql), so the app cannot write
-- consent_at directly at sign-up: there is no row and no session yet. The
-- register screen therefore sends the timestamp as user metadata and the
-- trigger copies it across when the profile is created, exactly as it already
-- does for full_name.
--
-- Safe to re-run: every statement is idempotent.

alter table public.profiles
  add column if not exists consent_at timestamptz;

comment on column public.profiles.consent_at is
  'When the user accepted the privacy notice at sign-up (POPIA record of consent).';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, consent_at)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), ''),
    -- Invalid or absent timestamps must not break the sign-up, so parse defensively
    case
      when (new.raw_user_meta_data ->> 'consent_at') ~
           '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}'
      then (new.raw_user_meta_data ->> 'consent_at')::timestamptz
      else null
    end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;
