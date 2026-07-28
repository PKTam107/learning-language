-- ============================================================
-- 0006: lam giau the (enrichment) — CEFR + word family + collocations.
-- Tu sinh khi tra tu MOI (Datamuse + danh sach CEFR-J) roi cache vao card.
-- The cu khong bi anh huong (cac cot mac dinh null/[]).
-- ============================================================
alter table public.cards
  add column if not exists cefr_level   text,
  add column if not exists word_family  jsonb not null default '[]'::jsonb,
  add column if not exists collocations jsonb not null default '[]'::jsonb;
