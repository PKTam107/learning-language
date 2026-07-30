-- ============================================================
-- 0008: index phuc vu trang Tien do (huy hieu, heatmap, thu thach, lich on).
-- Khong doi schema — chi them index cho cac truy van moi:
--   - Lich on (calendar): loc card_progress theo user + ngay den han.
--   - Thu thach hom nay: dem the tao trong ngay (cards theo user + created_at).
-- Heatmap/streak dung lai index review_events_user_time da co o 0004.
-- ============================================================
create index if not exists card_progress_user_due
  on public.card_progress (user_id, next_due_at);

create index if not exists cards_user_created
  on public.cards (user_id, created_at desc);
