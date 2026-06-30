-- ============================================================
-- LinguaCards — Initial schema + RLS
-- Chạy trong Supabase: SQL Editor → dán file này → Run
-- ============================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------- Helper: set updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  default_source_language text not null default 'en',
  default_target_language text not null default 'vi',
  created_at timestamptz not null default now()
);

-- Tự tạo profile khi có user mới
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- decks
-- ============================================================
create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  source_language text not null default 'en',
  target_language text not null default 'vi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists decks_user_id_idx on public.decks(user_id);

drop trigger if exists decks_set_updated_at on public.decks;
create trigger decks_set_updated_at
  before update on public.decks
  for each row execute function public.set_updated_at();

-- ============================================================
-- cards
-- ============================================================
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  term text not null,
  phonetic text,
  audio_us text,
  audio_uk text,
  part_of_speech text,
  meaning_vi text,
  definitions jsonb not null default '[]'::jsonb,
  examples jsonb not null default '[]'::jsonb,
  source_language text not null default 'en',
  target_language text not null default 'vi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists cards_deck_id_idx on public.cards(deck_id);
create index if not exists cards_user_id_idx on public.cards(user_id);

drop trigger if exists cards_set_updated_at on public.cards;
create trigger cards_set_updated_at
  before update on public.cards
  for each row execute function public.set_updated_at();

-- ============================================================
-- card_progress (đặt nền cho Spaced Repetition)
-- ============================================================
create table if not exists public.card_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null references public.cards(id) on delete cascade,
  status text not null default 'new' check (status in ('new','hard','good','easy')),
  review_count int not null default 0,
  last_reviewed_at timestamptz,
  -- để sẵn cho SM-2 tương lai (chưa dùng ở MVP)
  next_due_at timestamptz,
  ease_factor numeric default 2.5,
  unique (user_id, card_id)
);

-- ============================================================
-- dictionary_cache (cache kết quả lookup, dùng chung)
-- ============================================================
create table if not exists public.dictionary_cache (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  source_language text not null,
  target_language text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (term, source_language, target_language)
);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles      enable row level security;
alter table public.decks         enable row level security;
alter table public.cards         enable row level security;
alter table public.card_progress enable row level security;
alter table public.dictionary_cache enable row level security;

-- profiles: chỉ chính chủ
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- decks: chủ sở hữu toàn quyền
drop policy if exists "decks_all_own" on public.decks;
create policy "decks_all_own" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cards: chủ sở hữu toàn quyền
drop policy if exists "cards_all_own" on public.cards;
create policy "cards_all_own" on public.cards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- card_progress: chủ sở hữu toàn quyền
drop policy if exists "progress_all_own" on public.card_progress;
create policy "progress_all_own" on public.card_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- dictionary_cache: cho user đăng nhập đọc; ghi qua server (service role bỏ qua RLS).
drop policy if exists "cache_select_authenticated" on public.dictionary_cache;
create policy "cache_select_authenticated" on public.dictionary_cache
  for select using (auth.role() = 'authenticated');
