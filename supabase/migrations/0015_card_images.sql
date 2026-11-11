-- Optional selected photo + attribution; existing card RLS also protects this column.
alter table public.cards add column if not exists image jsonb default null;
