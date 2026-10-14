-- The shop's name, collected on the Create account screen.
--
-- It is the one extra thing worth asking for at sign-up: it goes in the POS
-- header, on receipts and on reports, so the app cannot show a real shop
-- without it. Everything else about the shop is asked after verification, in
-- onboarding, where the answers seed the catalogue.
--
-- Same path as full_name and consent_at: there is no profile row and no session
-- at sign-up (see 20261007105930_profiles_after_verification.sql), so the
-- register screen sends the name as user metadata and the trigger copies it
-- across when the profile is created.
--
-- Safe to re-run: every statement is idempotent.

alter table public.profiles
  add column if not exists shop_name text check (char_length(shop_name) <= 100);

comment on column public.profiles.shop_name is
  'The name of the shop, as given at sign-up. Shown in the POS header and on receipts.';

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, shop_name, consent_at)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 100), ''),
    nullif(left(trim(new.raw_user_meta_data ->> 'shop_name'), 100), ''),
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
