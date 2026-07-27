-- ============================================================
-- review_events: nhật ký từng lượt ôn — nền cho streak & thống kê.
-- Append-only: mỗi lần đánh giá 1 thẻ (hard/good/easy) ghi 1 dòng.
-- (card_progress.last_reviewed_at bị ghi đè mỗi lần nên không dùng
--  để dựng lịch sử theo ngày được.)
-- ============================================================
create table if not exists public.review_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.cards(id) on delete set null,
  status text not null check (status in ('hard', 'good', 'easy')),
  reviewed_at timestamptz not null default now()
);

-- Truy vấn streak/thống kê luôn lọc theo user + khoảng thời gian gần nhất.
create index if not exists review_events_user_time
  on public.review_events (user_id, reviewed_at desc);

-- ---------- Row Level Security: chủ sở hữu toàn quyền ----------
alter table public.review_events enable row level security;

drop policy if exists "review_events_all_own" on public.review_events;
create policy "review_events_all_own" on public.review_events
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
