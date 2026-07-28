-- ============================================================
-- 0007: danh dau thoi diem "da thu lam giau" cho tung the.
-- Dung de dem chinh xac so the con thieu enrichment (nut "Lam giau N the"):
--   - enriched_at IS NULL  -> chua thu lam giau -> can backfill.
--   - enriched_at co gia tri -> da xu ly (ke ca khi khong tim duoc du lieu,
--     vd cum tu khong co word family) -> khong dem lai.
-- ============================================================
alter table public.cards
  add column if not exists enriched_at timestamptz;

-- Cac the tao boi lookup sau 0006 da co san du lieu lam giau → danh dau da xu ly
-- de khong bi backfill lai.
update public.cards
  set enriched_at = coalesce(updated_at, now())
  where enriched_at is null
    and (
      cefr_level is not null
      or word_family <> '[]'::jsonb
      or collocations <> '[]'::jsonb
    );
