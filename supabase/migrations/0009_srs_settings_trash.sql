-- ============================================================
-- LinguaCards — 0009: lịch ôn thật (learning steps) + hạn mức từ mới
--                     + đồng bộ cài đặt + thùng rác 30 ngày
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. card_progress: đủ trạng thái cho lịch ôn kiểu SM-2 có bước học
-- ------------------------------------------------------------
-- Trước 0009, khoảng ôn (interval) được SUY RA từ `next_due_at - last_reviewed_at`.
-- Cách đó lệch dần: ôn sớm/muộn một ngày là khoảng bị co/giãn theo, và không
-- phân biệt được thẻ đang trong giai đoạn học với thẻ đã vào nhịp giãn cách.
-- Nay lưu tường minh:
--   interval_days  — khoảng đã chốt cho lần ôn kế (ngày). 0 khi đang học.
--   srs_phase      — learning (thẻ mới) / review (đã tốt nghiệp) / relearning (vừa sai).
--   learning_step  — số bước học đã qua trong phase hiện tại.
--   lapses         — số lần "quên" ở giai đoạn review (để nhận diện thẻ leech).
--   introduced_at  — lần ôn ĐẦU TIÊN của thẻ, dùng đếm hạn mức "từ mới mỗi ngày".
alter table public.card_progress
  add column if not exists interval_days numeric(8,2) not null default 0,
  add column if not exists srs_phase     text not null default 'review',
  add column if not exists learning_step smallint not null default 0,
  add column if not exists lapses        int not null default 0,
  add column if not exists introduced_at timestamptz;

do $$
begin
  alter table public.card_progress
    add constraint card_progress_srs_phase_check
    check (srs_phase in ('learning', 'review', 'relearning'));
exception
  when duplicate_object then null; -- đã có (chạy lại migration)
end;
$$;

-- Backfill thẻ đã học trước 0009: coi như đã tốt nghiệp, khoảng lấy đúng bằng
-- khoảng cách lần hẹn gần nhất (đó cũng chính là công thức cũ đang dùng).
update public.card_progress
  set interval_days = greatest(
        0,
        round(extract(epoch from (next_due_at - last_reviewed_at)) / 86400.0)
      )
  where interval_days = 0
    and last_reviewed_at is not null
    and next_due_at is not null;

-- Lần ôn đầu tiên không được ghi lại trước 0009 → lấy xấp xỉ:
--   có nhật ký ôn thì dùng lượt sớm nhất, không thì dùng lần ôn gần nhất.
-- Chỉ ảnh hưởng con số "từ mới hôm nay" của những ngày đã qua.
update public.card_progress p
  set introduced_at = coalesce(
        (
          select min(e.reviewed_at) from public.review_events e
          where e.card_id = p.card_id and e.user_id = p.user_id
        ),
        p.last_reviewed_at
      )
  where p.introduced_at is null
    and p.last_reviewed_at is not null;

-- Đếm "số từ mới đã học hôm nay" (hạn mức từ mới) chạy trên cặp cột này.
create index if not exists card_progress_user_introduced
  on public.card_progress (user_id, introduced_at);

-- ------------------------------------------------------------
-- 2. profiles.settings: cài đặt đi theo TÀI KHOẢN
-- ------------------------------------------------------------
-- Trước 0009 cài đặt chỉ nằm trong localStorage/AsyncStorage của từng thiết bị,
-- nên đổi máy là mất. Giao diện sáng/tối vẫn cố tình giữ theo thiết bị.
alter table public.profiles
  add column if not exists settings jsonb not null default '{}'::jsonb;

-- Cài đặt lưu vào profile, mà profile chỉ được tạo bởi trigger lúc đăng ký →
-- tài khoản tạo trước khi có trigger sẽ không có dòng nào để update. Vá sẵn.
insert into public.profiles (id)
  select u.id from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3. deleted_items: thùng rác 30 ngày cho thẻ & bộ thẻ
-- ------------------------------------------------------------
-- Xóa thẻ/bộ thẻ (kể cả xóa hàng loạt) là thao tác không có đường về, mà bộ thẻ
-- xóa kéo theo toàn bộ thẻ bên trong. Nay xóa = CHUYỂN vào bảng lưu trữ này rồi
-- mới xóa khỏi `cards`/`decks`.
--
-- Vì sao lưu cả bản ghi dạng jsonb thay vì cột `deleted_at` trên `cards`:
-- mọi truy vấn hiện có (web + mobile, thống kê, export, chống trùng từ) sẽ phải
-- thêm điều kiện lọc — sót một chỗ là thẻ đã xóa lại lọt vào phiên học hoặc số
-- liệu. Chuyển hẳn sang bảng khác thì không có truy vấn nào cần đổi.
--
-- Lưu ý: `review_events.card_id` là ON DELETE SET NULL (migration 0004) nên
-- nhật ký ôn (streak/heatmap) không mất khi xóa thẻ, nhưng phục hồi thẻ thì
-- không nối lại được liên kết đó.
create table if not exists public.deleted_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('card', 'deck')),
  -- id gốc, giữ lại để phục hồi đúng bản ghi cũ (không phải khóa ngoại: bản gốc đã bị xóa).
  item_id uuid not null,
  -- Nhãn hiện ở danh sách thùng rác: từ (thẻ) hoặc tên bộ thẻ.
  label text not null,
  -- Với kind='card': tên bộ thẻ gốc, để người dùng biết thẻ này từ đâu.
  deck_name text,
  -- kind='card': { card, progress }
  -- kind='deck': { deck, cards: [{ card, progress }] }
  payload jsonb not null,
  card_count int not null default 0,
  deleted_at timestamptz not null default now()
);

create index if not exists deleted_items_user_time
  on public.deleted_items (user_id, deleted_at desc);

alter table public.deleted_items enable row level security;

drop policy if exists "deleted_items_all_own" on public.deleted_items;
create policy "deleted_items_all_own" on public.deleted_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

revoke all on public.deleted_items from anon;
grant select, insert, update, delete on public.deleted_items to authenticated;
