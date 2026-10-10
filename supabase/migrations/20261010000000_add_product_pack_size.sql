alter table public.products
  add column pack_size numeric not null default 1
  check (pack_size > 0);