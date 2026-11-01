-- ============================================================
-- LinguaCards — 0013: ngữ cảnh cho nhật ký ôn (G2)
--                     + dọn dẹp theo tuổi cho job nền (G3)
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================

-- ------------------------------------------------------------
-- 1. review_events: lượt ôn đó thực ra là lượt ôn GÌ
-- ------------------------------------------------------------
-- Từ 0004 tới nay nhật ký chỉ có `status` + `reviewed_at`. Đủ cho streak và
-- heatmap (chỉ cần "hôm đó có học không"), nhưng KHÔNG đủ để trả lời câu hỏi
-- quan trọng hơn: "trí nhớ đang khỏe hay yếu?".
--
-- Tỷ lệ nhớ thật = % thẻ nhớ được **khi tới hạn**. Trên dữ liệu cũ, thẻ mới học
-- lần đầu (chắc chắn chưa thuộc) bị trộn chung với thẻ tới hạn thật, ra một con
-- số không dùng được để chỉnh gì. Ba cột dưới đây tách được hai nhóm đó:
--
--   review_type     — kiểu ôn đã dùng. Kèm theo trả lời được "kiểu nào hay sai
--                     nhất", tức là dữ liệu để chỉnh chính sách của chế độ
--                     "Tự động" (hiện đang đặt bằng phỏng đoán).
--   was_due         — lúc ôn, thẻ đã tới hạn chưa. false = học lần đầu hoặc ôn
--                     sớm; chỉ dòng true mới được tính vào tỷ lệ nhớ.
--   interval_before — khoảng ôn (ngày) TRƯỚC lượt này. Cho biết quên ở mốc nào:
--                     quên thẻ hẹn 1 ngày khác hẳn quên thẻ hẹn 60 ngày.
--
-- Cả ba đều nullable: dòng cũ không có cách nào suy ra được, và để null thì báo
-- cáo tự loại chúng ra thay vì đoán bừa một giá trị rồi tính sai.
--
-- LƯU Ý NGHIỆP VỤ: báo cáo chỉ đọc được dữ liệu KỂ TỪ ngày chạy migration này.
-- Càng chạy muộn càng mất dữ liệu không lấy lại được — đó là lý do phần ghi log
-- tách khỏi phần màn hình báo cáo và làm trước.
alter table public.review_events
  add column if not exists review_type     text,
  add column if not exists was_due         boolean,
  add column if not exists interval_before numeric(8,2);

do $$
begin
  alter table public.review_events
    add constraint review_events_review_type_check
    check (
      review_type is null
      or review_type in ('flashcard', 'mcq', 'mcq_reverse', 'typing', 'listening', 'cloze')
    );
exception
  when duplicate_object then null; -- đã có (chạy lại migration)
end;
$$;

-- ------------------------------------------------------------
-- 2. dictionary_cache: biết dòng nào còn được dùng
-- ------------------------------------------------------------
-- `created_at` là lần ĐẦU một từ được cache và không bao giờ đổi — kể cả khi từ
-- đó được tra lại mỗi ngày (lookup ghi bằng upsert, nhánh update không đụng
-- `created_at`). Dọn cache theo cột đó là xóa nhầm đúng những từ hay tra nhất.
--
-- `updated_at` + trigger `set_updated_at()` (đã có từ 0001) cho biết lần CUỐI
-- dòng được ghi lại, tức là lần cuối từ đó thực sự được dùng.
alter table public.dictionary_cache
  add column if not exists updated_at timestamptz not null default now();

drop trigger if exists dictionary_cache_set_updated_at on public.dictionary_cache;
create trigger dictionary_cache_set_updated_at
  before update on public.dictionary_cache
  for each row execute function public.set_updated_at();

-- Dọn dẹp quét theo cột này; index giữ cho job nền không phải đọc cả bảng.
create index if not exists dictionary_cache_updated_at
  on public.dictionary_cache (updated_at);

-- ------------------------------------------------------------
-- 3. Dọn cache nguội — hàm cho job nền gọi
-- ------------------------------------------------------------
-- Gói Supabase free giới hạn ~500 MB Postgres, và `dictionary_cache` là bảng
-- duy nhất phình VÔ HẠN theo thời gian (mỗi từ mới ai đó tra là một dòng
-- jsonb, không bao giờ tự mất đi).
--
-- Dọn theo TUỔI (không phải theo số dòng): từ nào còn được tra thì `updated_at`
-- tự mới lại và ở lại mãi; chỉ từ tra một lần rồi thôi mới bị xóa. Xóa nhầm
-- cũng không mất mát gì — lần tra sau chỉ tốn thêm một vòng gọi từ điển rồi
-- cache lại.
--
-- Cùng họ với `prune_rate_limit_counters()` (0010) và gọi cùng chỗ.
create or replace function public.prune_dictionary_cache(p_days int default 90)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  delete from public.dictionary_cache
  where updated_at < now() - make_interval(days => greatest(p_days, 7));
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Chỉ job nền (service role) được gọi; người dùng thường không có cửa xóa cache
-- dùng chung của cả hệ thống.
revoke all on function public.prune_dictionary_cache(int) from public;
grant execute on function public.prune_dictionary_cache(int) to service_role;
