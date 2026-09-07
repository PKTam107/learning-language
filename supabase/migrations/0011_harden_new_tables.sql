-- ============================================================
-- LinguaCards — 0011: siết quyền bảng cho 2 bảng ra đời sau 0003
-- Chạy trong Supabase: SQL Editor → dán file này → Run
--
-- 0003 đã thu hồi quyền của vai trò `anon` trên các bảng dữ liệu người dùng,
-- nhưng review_events (0004) và user_devices (0010) sinh ra sau nên vẫn giữ
-- quyền mặc định mà Supabase cấp cho anon/authenticated trên schema public.
--
-- RLS vẫn đang chặn đúng (policy lọc theo auth.uid(), mà anon thì uid = null),
-- nên đây là lớp phòng thủ thứ hai chứ không phải vá lỗ hổng: nếu sau này có ai
-- lỡ tay drop một policy, tầng quyền bảng vẫn chặn request không có JWT.
-- ============================================================

-- ---------- review_events: nhật ký ôn của từng người ----------
revoke all on public.review_events from anon;
grant select, insert, update, delete on public.review_events to authenticated;

-- ---------- user_devices: thiết bị đăng nhập ----------
-- Client chỉ ĐỌC bảng này; mọi thao tác ghi đi qua RPC SECURITY DEFINER trong
-- 0010 (chúng chạy dưới quyền chủ hàm nên không cần quyền bảng của người gọi).
revoke all on public.user_devices from anon;
revoke all on public.user_devices from authenticated;
grant select on public.user_devices to authenticated;
