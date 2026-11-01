-- Một dòng heartbeat cố định, không tăng dung lượng theo số ngày.
create table if not exists public.system_heartbeat (
  id text primary key check (id = 'daily'),
  last_seen_at timestamptz not null default now()
);
alter table public.system_heartbeat enable row level security;
revoke all on table public.system_heartbeat from public, anon, authenticated;
grant select, insert, update on table public.system_heartbeat to service_role;
