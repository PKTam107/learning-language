-- ============================================================
-- LinguaCards — 0002: bổ sung trường thẻ + chống trùng từ trong deck
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================

-- ---------- Bổ sung trường cho cards ----------
-- IPA UK/US tách riêng (phonetic cũ vẫn giữ làm phiên âm chung / fallback),
-- và ghi chú cá nhân của người dùng cho từng thẻ.
alter table public.cards
  add column if not exists phonetic_uk text,
  add column if not exists phonetic_us text,
  add column if not exists note        text;

-- ---------- Chống trùng từ trong cùng một deck ----------
-- Chuẩn hóa khi so trùng: bỏ khoảng trắng đầu/cuối + không phân biệt hoa/thường.
-- Cùng một từ vẫn được phép tồn tại ở nhiều deck khác nhau.
--
-- LƯU Ý: nếu deck hiện có sẵn từ trùng (theo chuẩn hóa), lệnh tạo index sẽ báo lỗi.
-- Hãy dọn trùng trước bằng truy vấn kiểm tra:
--   select deck_id, lower(btrim(term)) t, count(*)
--   from public.cards group by 1,2 having count(*) > 1;
create unique index if not exists cards_deck_term_norm_idx
  on public.cards (deck_id, lower(btrim(term)));
