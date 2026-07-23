-- ============================================================
-- LinguaCards — 0003: siết phân quyền (RLS) theo từng user
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================
-- Mục tiêu: mỗi user chỉ đụng được dữ liệu của chính mình khi gọi API.
-- Nền tảng đã có ở 0001 (policy auth.uid() = user_id). File này siết thêm:
--   1. Thu hồi quyền của vai trò ẩn danh (anon): request KHÔNG kèm JWT hợp lệ
--      bị chặn ngay ở tầng quyền bảng, trước cả khi tới policy.
--   2. Cấp quyền tường minh cho vai trò 'authenticated' (policy vẫn lọc theo user).
--   3. Buộc thẻ/tiến độ phải thuộc đúng chuỗi sở hữu deck → card → progress.
--
-- LƯU Ý: KHÔNG dùng `force row level security`. RLS đã áp dụng cho các vai trò
-- API (anon/authenticated) vì chúng không phải chủ bảng. FORCE sẽ khiến trigger
-- security-definer `handle_new_user` (tạo profile lúc đăng ký, auth.uid() = null)
-- bị chặn bởi policy → hỏng luồng đăng ký.
-- ============================================================

-- ---------- 1. Chặn vai trò ẩn danh khỏi bảng dữ liệu người dùng ----------
-- anon key vẫn dùng để gọi API, nhưng khi CÓ JWT hợp lệ role đổi thành
-- 'authenticated'. Không JWT hợp lệ → không đụng được các bảng này.
revoke all on public.profiles         from anon;
revoke all on public.decks            from anon;
revoke all on public.cards            from anon;
revoke all on public.card_progress    from anon;
revoke all on public.dictionary_cache from anon;

-- ---------- 2. Quyền bảng tường minh cho user đã đăng nhập ----------
grant select, insert, update, delete on public.profiles      to authenticated;
grant select, insert, update, delete on public.decks         to authenticated;
grant select, insert, update, delete on public.cards         to authenticated;
grant select, insert, update, delete on public.card_progress to authenticated;
grant select                          on public.dictionary_cache to authenticated;

-- ---------- 3. Siết policy sở hữu (idempotent) ----------
-- cards: của chính user VÀ thẻ phải nằm trong deck do user sở hữu.
drop policy if exists "cards_all_own" on public.cards;
create policy "cards_all_own" on public.cards
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.decks d
      where d.id = cards.deck_id and d.user_id = auth.uid()
    )
  );

-- card_progress: của chính user VÀ card phải thuộc user đó.
drop policy if exists "progress_all_own" on public.card_progress;
create policy "progress_all_own" on public.card_progress
  for all
  using (
    auth.uid() = user_id
    and exists (
      select 1 from public.cards c
      where c.id = card_progress.card_id and c.user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.cards c
      where c.id = card_progress.card_id and c.user_id = auth.uid()
    )
  );
