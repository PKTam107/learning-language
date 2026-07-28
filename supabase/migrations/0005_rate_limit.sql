-- ============================================================
-- Rate limit cho các API tốn kém (vd /api/lookup gọi AI dịch).
-- Đếm theo cửa sổ cố định (fixed window) trên mỗi user + "bucket".
-- Gọi qua service_role trong route handler (BỎ QUA RLS) — server đã xác
-- thực user trước rồi mới truyền p_user_id vào.
-- ============================================================
create table if not exists public.rate_limit_counters (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  window_start timestamptz not null default now(),
  count int not null default 0,
  primary key (user_id, bucket)
);

-- Chỉ service_role đụng bảng này. Bật RLS + không policy = khóa với anon/authenticated.
alter table public.rate_limit_counters enable row level security;

-- ------------------------------------------------------------
-- consume_rate_limit: tăng bộ đếm 1 đơn vị trong cửa sổ hiện tại một cách
-- atomic; trả về TRUE nếu vẫn trong hạn mức, FALSE nếu đã vượt.
-- Nếu cửa sổ cũ đã hết hạn thì reset về 1 (bắt đầu cửa sổ mới).
-- ------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_user_id uuid,
  p_bucket text,
  p_limit int,
  p_window_seconds int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count int;
begin
  insert into public.rate_limit_counters as r (user_id, bucket, window_start, count)
  values (p_user_id, p_bucket, v_now, 1)
  on conflict (user_id, bucket) do update
    set
      -- Cửa sổ đã hết hạn → mở cửa sổ mới; còn hạn → giữ nguyên mốc bắt đầu.
      window_start = case
        when r.window_start < v_now - make_interval(secs => p_window_seconds)
          then v_now
        else r.window_start
      end,
      count = case
        when r.window_start < v_now - make_interval(secs => p_window_seconds)
          then 1
        else r.count + 1
      end
  returning r.count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_rate_limit(uuid, text, int, int) from public;
grant execute on function public.consume_rate_limit(uuid, text, int, int) to service_role;
