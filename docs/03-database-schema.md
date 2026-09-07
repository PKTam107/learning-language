# Database Schema — LinguaCards (Supabase / Postgres)

Migration thực thi:
- [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) — schema gốc + RLS.
- [`supabase/migrations/0002_card_fields_and_dedup.sql`](../supabase/migrations/0002_card_fields_and_dedup.sql) — thêm `phonetic_uk`, `phonetic_us`, `note` cho `cards` và unique index chống trùng từ trong deck.
- [`supabase/migrations/0005_rate_limit.sql`](../supabase/migrations/0005_rate_limit.sql) — bộ đếm rate limit + RPC `consume_rate_limit`.
- [`supabase/migrations/0010_devices.sql`](../supabase/migrations/0010_devices.sql) — bảng `user_devices` + RPC ghi nhận / liệt kê / thu hồi thiết bị.
- [`supabase/migrations/0011_harden_new_tables.sql`](../supabase/migrations/0011_harden_new_tables.sql) — thu hồi quyền `anon` trên `review_events` và `user_devices` (0003 chỉ phủ các bảng có trước).

## 1. Sơ đồ quan hệ

```
auth.users (Supabase)
   │ 1
   │
   ├──< profiles            (1-1, hồ sơ + setting ngôn ngữ)
   │
   ├──< decks               (1-n)
   │       │ 1
   │       └──< cards        (1-n)
   │               │ 1
   │               └──< card_progress (1-1 theo user+card)
   │
dictionary_cache            (toàn cục, không gắn user — cache kết quả lookup)
```

## 2. Bảng

### `profiles`
Hồ sơ người dùng + cấu hình ngôn ngữ học mặc định.

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | = auth.users.id |
| display_name | text | |
| avatar_url | text | |
| default_source_language | text | mặc định `'en'` |
| default_target_language | text | mặc định `'vi'` |
| created_at | timestamptz | default now() |

### `decks`
Bộ từ vựng theo chủ đề.

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | gen_random_uuid() |
| user_id | uuid FK→auth.users | owner |
| name | text NOT NULL | "TOEIC 900"... |
| description | text | |
| source_language | text NOT NULL | default `'en'` |
| target_language | text NOT NULL | default `'vi'` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `cards`
Flashcard. Các trường rich (phonetics, definitions, examples) lưu dạng JSONB để linh hoạt với cấu trúc trả về từ dictionary.

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | owner (tiện cho RLS) |
| deck_id | uuid FK→decks ON DELETE CASCADE | thuộc deck nào |
| term | text NOT NULL | từ/cụm tiếng Anh |
| phonetic | text | IPA chung / fallback, vd `/rɪˈzɪl.jənt/` |
| phonetic_uk | text | IPA giọng Anh (nếu tách được) |
| phonetic_us | text | IPA giọng Mỹ (nếu tách được) |
| audio_us | text | URL audio US |
| audio_uk | text | URL audio UK |
| part_of_speech | text | từ loại chính (noun/verb/...) |
| meaning_vi | text | nghĩa tiếng Việt đã chọn/sửa |
| note | text | ghi chú cá nhân của người dùng |
| definitions | jsonb | mảng `{ partOfSpeech, definition, definitionVi }` (nhiều nghĩa) |
| examples | jsonb | mảng `{ text, textVi }` (nhiều ví dụ) |
| source_language | text | default `'en'` |
| target_language | text | default `'vi'` |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**Chống trùng:** unique index `cards_deck_term_norm_idx` trên `(deck_id, lower(btrim(term)))`
— không cho trùng từ trong cùng deck (chuẩn hóa bỏ khoảng trắng đầu/cuối + không phân biệt
hoa/thường); cùng một từ vẫn được phép ở nhiều deck.

### `card_progress`
Trạng thái thuộc bài (đặt nền cho SRS sau này). 1 dòng / (user, card).

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | |
| card_id | uuid FK→cards ON DELETE CASCADE | |
| status | text | `'new' | 'hard' | 'good' | 'easy'` (default `'new'`) |
| review_count | int | default 0 |
| last_reviewed_at | timestamptz | |
| **(SRS tương lai)** next_due_at | timestamptz | chưa dùng ở MVP, để sẵn |
| ease_factor | numeric | để sẵn cho SM-2 |
| UNIQUE(user_id, card_id) | | mỗi user 1 progress / card |

### `dictionary_cache`
Cache kết quả lookup để giảm gọi API & token AI. Không gắn user (dùng chung).

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| term | text | normalized lowercase |
| source_language | text | |
| target_language | text | |
| payload | jsonb | toàn bộ draft card đã build |
| created_at | timestamptz | |
| UNIQUE(term, source_language, target_language) | | |

### `rate_limit_counters`
Bộ đếm rate limit theo cửa sổ cố định (migration `0005`). Một dòng cho mỗi
(user, bucket); bucket là tên route (`lookup`, `enrich`, `translate`), có hậu tố
`:day` cho hạn mức ngày và `:d:<device_id>` cho hạn mức theo thiết bị.

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| user_id | uuid FK→auth.users | PK cùng `bucket` |
| bucket | text | tên bộ đếm |
| window_start | timestamptz | mốc mở cửa sổ hiện tại |
| count | int | số lượt đã dùng trong cửa sổ |

RLS bật, **không policy** → chỉ `service_role` đụng được. Tăng đếm bằng RPC
`consume_rate_limit(user, bucket, limit, window_seconds)` (atomic trong Postgres,
đúng cả khi chạy nhiều instance serverless).

### `user_devices`
Thiết bị đã đăng nhập vào tài khoản (migration `0010`).

| Cột | Kiểu | Ghi chú |
|-----|------|---------|
| id | uuid PK | |
| user_id | uuid FK→auth.users | owner |
| device_id | text | id do client sinh, lưu localStorage / AsyncStorage |
| session_id | uuid | phiên `auth.sessions` gần nhất của máy — để thu hồi từ xa |
| name | text | "Chrome · Windows", "Pixel 7 · Android" |
| platform | text | `web` / `ios` / `android` |
| app_version | text | bản mobile |
| user_agent | text | |
| last_ip | text | lấy từ `x-forwarded-for` |
| first_seen_at / last_seen_at | timestamptz | |
| UNIQUE(user_id, device_id) | | |

## 3. Row Level Security (RLS)

Bật RLS cho `profiles`, `decks`, `cards`, `card_progress`. Nguyên tắc:
**user chỉ đọc/ghi dòng có `user_id = auth.uid()`** (profiles dùng `id = auth.uid()`).

`dictionary_cache`: không bật RLS theo user — ghi/đọc qua route handler dùng service role
(hoặc cho phép `select` công khai cho người đã đăng nhập, `insert` chỉ qua server).

`rate_limit_counters`: RLS bật, không policy — chỉ service_role.

`user_devices`: chỉ cho `select` dòng của mình. Thêm/sửa/xóa đi qua 3 hàm
SECURITY DEFINER trong `0010` — chúng vẫn lấy danh tính từ JWT người gọi
(`auth.uid()` và claim `session_id`) nên một endpoint phục vụ được cả web
(cookie) lẫn mobile (Bearer):

- `touch_user_device(...)` — upsert "máy này vừa hoạt động", kèm session hiện tại.
- `list_user_devices()` — danh sách của mình + `is_current` / `is_active`.
- `revoke_user_device(device_id)` — xóa dòng `auth.sessions` của máy đó (đăng
  xuất thật) rồi bỏ khỏi danh sách. Không bao giờ giết phiên hiện tại.

Chi tiết policy nằm trong file migration.

## 4. Trigger / tiện ích

- `handle_new_user()` + trigger `on_auth_user_created`: tự tạo `profiles` khi có user mới.
- `set_updated_at()` + trigger trên `decks`, `cards`: tự cập nhật `updated_at`.

## 5. Index gợi ý

- `cards(deck_id)`, `cards(user_id)`.
- `cards(deck_id, lower(btrim(term)))` UNIQUE — chống trùng từ trong deck.
- `card_progress(user_id, card_id)` (đã có qua UNIQUE).
- `dictionary_cache(term, source_language, target_language)` (đã có qua UNIQUE).
- `review_events(user_id, reviewed_at desc)` (migration `0004`) — streak, heatmap, "Bạn hay quên".
- `card_progress(user_id, next_due_at)` (migration `0008`) — lịch ôn tập / số thẻ tới hạn.
- `cards(user_id, created_at desc)` (migration `0008`) — đếm thẻ tạo trong ngày (thử thách hôm nay).
- `user_devices(user_id, last_seen_at desc)` (migration `0010`) — danh sách thiết bị.
