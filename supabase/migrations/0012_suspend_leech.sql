-- ============================================================
-- LinguaCards — 0012: tạm treo thẻ (xử lý thẻ "leech")
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================

-- Cột `lapses` đã có từ 0009 và `isLeech()` đã tính sẵn ngưỡng, nhưng chưa có
-- cách nào để NGƯNG một thẻ quên mãi không vào. Thẻ như vậy quay lại hàng đợi
-- gần như mỗi ngày, chiếm chỗ của những thẻ còn học được và làm người dùng nản.
--
-- `suspended_at` = thẻ bị rút khỏi mọi hàng đợi ôn, nhưng KHÔNG mất: vẫn nằm
-- trong bộ thẻ, vẫn đếm vào tổng số từ, và bỏ treo lại được bất cứ lúc nào.
-- Cố ý đặt ở `card_progress` (không phải `cards`): đây là trạng thái học, cùng
-- chỗ với `next_due_at`/`lapses`, nên reset tiến độ là treo cũng biến mất theo.
alter table public.card_progress
  add column if not exists suspended_at timestamptz;

-- Hàng đợi hôm nay lọc theo cột này ở phía client, nhưng index vẫn có ích cho
-- các truy vấn đếm về sau (và rất rẻ vì đa số hàng có giá trị null).
create index if not exists card_progress_user_suspended
  on public.card_progress (user_id, suspended_at)
  where suspended_at is not null;
