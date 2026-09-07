-- ============================================================
-- LinguaCards — 0010: thiết bị đăng nhập (user_devices)
-- Chạy trong Supabase: SQL Editor → dán file này → Run
--
-- Ghi bằng RPC chứ không phải service_role: các hàm dưới đây là SECURITY
-- DEFINER nhưng vẫn lấy danh tính từ JWT của chính người gọi (auth.uid()
-- và claim `session_id`). Nhờ vậy một endpoint duy nhất phục vụ được cả web
-- (cookie) lẫn mobile (Bearer), và không thiết bị nào giả danh user khác được.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bảng thiết bị
-- ------------------------------------------------------------
-- `device_id` do client sinh (uuid ngẫu nhiên, lưu localStorage / AsyncStorage)
-- và giữ nguyên qua các lần đăng nhập → nhận ra "vẫn máy cũ" thay vì đẻ dòng mới
-- mỗi phiên. `session_id` là phiên Supabase gần nhất của máy đó — có nó mới thu
-- hồi được đăng nhập từ xa (xem revoke_user_device).
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id text not null check (char_length(device_id) between 8 and 64),
  session_id uuid,
  name text,          -- "Chrome · Windows", "Pixel 7"…
  platform text,      -- web | ios | android
  app_version text,
  user_agent text,
  last_ip text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists user_devices_user_last_seen
  on public.user_devices (user_id, last_seen_at desc);

alter table public.user_devices enable row level security;

-- Chỉ cho ĐỌC trực tiếp; thêm/sửa/xóa bắt buộc đi qua RPC bên dưới để còn
-- kèm được session_id và thao tác lên auth.sessions.
drop policy if exists "user_devices_select_own" on public.user_devices;
create policy "user_devices_select_own" on public.user_devices
  for select using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 2. touch_user_device — ghi nhận "máy này vừa hoạt động"
-- ------------------------------------------------------------
-- Upsert theo (user_id, device_id). Mọi trường đều coalesce để một lần ping
-- thiếu thông tin (vd không có user-agent) không xóa dữ liệu đã có.
create or replace function public.touch_user_device(
  p_device_id text,
  p_name text default null,
  p_platform text default null,
  p_app_version text default null,
  p_user_agent text default null,
  p_ip text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_devices as d
    (user_id, device_id, session_id, name, platform, app_version, user_agent, last_ip)
  values
    (v_user, p_device_id, v_session, p_name, p_platform, p_app_version,
     left(p_user_agent, 400), p_ip)
  on conflict (user_id, device_id) do update
    set session_id   = coalesce(excluded.session_id, d.session_id),
        name         = coalesce(excluded.name, d.name),
        platform     = coalesce(excluded.platform, d.platform),
        app_version  = coalesce(excluded.app_version, d.app_version),
        user_agent   = coalesce(excluded.user_agent, d.user_agent),
        last_ip      = coalesce(excluded.last_ip, d.last_ip),
        last_seen_at = now();
end;
$$;

-- ------------------------------------------------------------
-- 3. list_user_devices — danh sách thiết bị của chính mình
-- ------------------------------------------------------------
-- is_active: phiên của máy đó CÒN SỐNG (dòng auth.sessions chưa bị xóa/hết hạn).
-- is_current: chính máy đang gọi hàm này.
create or replace function public.list_user_devices()
returns table (
  device_id text,
  name text,
  platform text,
  app_version text,
  last_ip text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  is_current boolean,
  is_active boolean
)
language sql
security definer
set search_path = public, auth
as $$
  select
    d.device_id,
    d.name,
    d.platform,
    d.app_version,
    d.last_ip,
    d.first_seen_at,
    d.last_seen_at,
    d.session_id is not null
      and d.session_id = nullif(auth.jwt() ->> 'session_id', '')::uuid,
    s.id is not null
  from public.user_devices d
  left join auth.sessions s
    on s.id = d.session_id and s.user_id = d.user_id
  where d.user_id = auth.uid()
  order by d.last_seen_at desc;
$$;

-- ------------------------------------------------------------
-- 4. revoke_user_device — đăng xuất & gỡ một thiết bị
-- ------------------------------------------------------------
-- Xóa dòng auth.sessions của máy đó → refresh token thành vô hiệu, lần gia hạn
-- kế tiếp máy đó bị đá ra. KHÔNG bao giờ giết phiên hiện tại (tự đăng xuất
-- chính mình dùng nút Đăng xuất bình thường).
--
-- Hàm phải chạy dưới role có quyền xóa trên auth.sessions. Chạy file này bằng
-- SQL Editor (role `postgres`) là đủ. Nếu project của bạn siết quyền schema auth
-- và gặp lỗi "permission denied for table sessions", chuyển chủ sở hữu hàm:
--   alter function public.revoke_user_device(text) owner to supabase_auth_admin;
create or replace function public.revoke_user_device(p_device_id text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_current uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  v_session uuid;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  select session_id into v_session
  from public.user_devices
  where user_id = v_user and device_id = p_device_id;

  if not found then
    return false;
  end if;

  if v_session is not null and v_session is distinct from v_current then
    delete from auth.sessions where id = v_session and user_id = v_user;
  end if;

  delete from public.user_devices
  where user_id = v_user and device_id = p_device_id;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- 5. Quyền: chỉ user đã đăng nhập mới gọi được
-- ------------------------------------------------------------
revoke all on function public.touch_user_device(text, text, text, text, text, text) from public;
revoke all on function public.list_user_devices() from public;
revoke all on function public.revoke_user_device(text) from public;

grant execute on function public.touch_user_device(text, text, text, text, text, text) to authenticated;
grant execute on function public.list_user_devices() to authenticated;
grant execute on function public.revoke_user_device(text) to authenticated;

-- ------------------------------------------------------------
-- 6. Dọn bộ đếm rate limit đã nguội
-- ------------------------------------------------------------
-- Từ 0010, rate limit đếm thêm theo thiết bị nên số dòng là user × máy × route.
-- Dòng quá 2 ngày chắc chắn đã ngoài mọi cửa sổ (dài nhất là 1 ngày) → xóa được.
-- Tùy chọn: hẹn giờ bằng pg_cron —
--   select cron.schedule('prune-rate-limit', '0 3 * * *',
--                        $$select public.prune_rate_limit_counters()$$);
create or replace function public.prune_rate_limit_counters()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.rate_limit_counters
  where window_start < now() - interval '2 days';
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

revoke all on function public.prune_rate_limit_counters() from public;
grant execute on function public.prune_rate_limit_counters() to service_role;
