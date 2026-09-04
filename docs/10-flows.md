# 10 — Sơ đồ luồng (Flows)

Tập sơ đồ **Mermaid** mô tả các luồng đang chạy trong code (as-built). GitHub render
trực tiếp; VS Code cần extension *Markdown Preview Mermaid Support*.

Quy ước: mỗi sơ đồ kèm link tới file nguồn — sơ đồ sai so với code thì **code là đúng**,
sửa sơ đồ theo. Xem thêm [02 — Architecture](./02-architecture.md) (tầng hệ thống) và
[07 — Current State](./07-current-state.md) (bảng tính năng).

| # | Luồng | Nguồn chính |
|---|---|---|
| [1](#1-bản-đồ-hệ-thống) | Bản đồ hệ thống | `src/app`, `mobile/app` |
| [2](#2-xác-thực--phiên) | Xác thực & phiên (web cookie / mobile Bearer) | [getUser.ts](../src/lib/supabase/getUser.ts) |
| [3](#3-tra-từ--thẻ-nháp--lưu-thẻ) | Tra từ → thẻ nháp → lưu thẻ | [lookup.ts](../src/lib/lookup.ts) |
| [4](#4-làm-giàu-thẻ-cũ-backfill) | Làm giàu thẻ cũ (backfill) | [enrich-backfill.ts](../src/lib/db/enrich-backfill.ts) |
| [5](#5-hàng-đợi-hôm-nay-hạn-mức-từ-mới) | Hàng đợi hôm nay + hạn mức từ mới | [queue.ts](../src/lib/queue.ts) |
| [6](#6-lịch-ôn-srs--máy-trạng-thái) | Lịch ôn SRS — máy trạng thái | [srs.ts](../src/lib/srs.ts) |
| [7](#7-phiên-học--hoàn-tác) | Phiên học + hoàn tác | [cards.ts](../src/lib/db/cards.ts) |
| [8](#8-xóa--thùng-rác-30-ngày) | Xóa & thùng rác 30 ngày | [trash.ts](../src/lib/db/trash.ts) |
| [9](#9-cài-đặt-theo-tài-khoản) | Cài đặt theo tài khoản | [settings.ts](../src/lib/settings.ts) |
| [10](#10-dữ-liệu--màn-tiến-độ) | Dữ liệu → màn Tiến độ | [insights.ts](../src/lib/db/insights.ts) |
| [11](#11-mô-hình-dữ-liệu) | Mô hình dữ liệu (ERD) | [migrations/](../supabase/migrations) |

---

## 1. Bản đồ hệ thống

Hai client, một backend. Dữ liệu người dùng đi **thẳng** vào Supabase (chặn bằng RLS);
mọi thứ cần API key đi **vòng qua route handler** để key không rời server.

```mermaid
flowchart LR
  subgraph CL["Client"]
    web["Web — Next.js App Router"]
    mob["Mobile — Expo Router"]
  end

  subgraph RH["Next.js Route Handlers — server, giữ API key"]
    lookup["POST /api/lookup"]
    translate["POST /api/translate"]
    enrich["POST /api/enrich"]
  end

  subgraph SB["Supabase"]
    auth["Auth — Google OAuth / email"]
    pg[("Postgres + RLS")]
  end

  dict["DictionaryAPI.dev"]
  ai["Dịch: mymemory / openai / gemini / libretranslate"]
  dm["Datamuse"]

  web -->|"query trực tiếp, RLS theo auth.uid()"| pg
  mob -->|"query trực tiếp, RLS theo auth.uid()"| pg
  web -->|"fetch + cookie"| RH
  mob -->|"fetch + Bearer token"| RH
  web -.-> auth
  mob -.-> auth

  lookup --> dict
  lookup --> ai
  lookup --> dm
  enrich --> dm
  translate --> ai
  lookup -->|"dictionary_cache, service role"| pg
```

**Bất biến cần giữ:** không client nào được gọi thẳng DictionaryAPI/AI/Datamuse, và
`SUPABASE_SERVICE_ROLE_KEY` chỉ xuất hiện trong route handler.

---

## 2. Xác thực & phiên

### 2.1 Đăng nhập Google (web)

```mermaid
sequenceDiagram
  autonumber
  actor U as Người dùng
  participant W as /login
  participant G as Google
  participant CB as /auth/callback
  participant MW as middleware.ts
  U->>W: Bấm "Đăng nhập với Google"
  W->>G: signInWithOAuth, redirectTo=/auth/callback
  G-->>CB: chuyển hướng kèm ?code=...
  CB->>CB: exchangeCodeForSession(code)
  CB-->>U: Set-Cookie sb-...-auth-token, về /dashboard
  loop mỗi request sau đó
    MW->>MW: getUser() làm mới cookie, chặn route cần đăng nhập
  end
```

Độ dài phiên (access token 1 ngày / phiên 1 tuần) là **cấu hình Supabase**, không phải
code — xem [09 — Auth session](./09-auth-session.md).

### 2.2 Route handler nhận cả hai kiểu xác thực

```mermaid
flowchart TD
  req["Request tới /api/*"] --> hdr{"Có header Authorization: Bearer?"}
  hdr -->|"có — mobile"| tok["anon client + getUser(token)"]
  hdr -->|"không — web"| ck["server client đọc cookie session"]
  tok --> u{"Có user?"}
  ck --> u
  u -->|"không"| e401["401 Unauthorized"]
  u -->|"có"| ok["Chạy handler với user.id"]
```

Nhờ vậy mobile **dùng lại nguyên** route handler của web, không cần backend thứ hai.

---

## 3. Tra từ → thẻ nháp → lưu thẻ

```mermaid
flowchart TD
  A["Gõ từ rồi Enter — QuickCreator"] --> B["POST /api/lookup"]
  B --> C{"Đã đăng nhập?"}
  C -->|"không"| C401["401"]
  C -->|"có"| D{"consume_rate_limit — 30 lượt/phút/user"}
  D -->|"vượt hạn mức"| D429["429 + Retry-After"]
  D -->|"còn lượt"| E{"Zod: word 1..100 ký tự"}
  E -->|"sai"| E400["400"]
  E -->|"đúng"| F{"dictionary_cache hit?"}

  F -->|"hit"| Z["DraftCard, fromCache = true"]
  F -->|"miss"| G["DictionaryAPI.dev"]
  G --> H{"Từ có trong từ điển?"}

  H -->|"không — thường là cụm từ"| I["Ghép IPA từng từ + dịch NGUYÊN cụm"]
  I --> L["Ghi dictionary_cache — service role"]

  H -->|"có"| J["Dịch batch: definitions + examples"]
  J --> K{"source = en?"}
  K -->|"có"| K2["enrichWord: CEFR offline + Datamuse word family/collocations"]
  K -->|"không"| L2["bỏ qua làm giàu"]
  K2 --> M{"Dịch thành công?"}
  L2 --> M
  M -->|"có"| L
  M -->|"không — translationSkipped"| Z
  L --> Z

  Z --> N["DraftEditor — người dùng sửa tay"]
  N --> O["saveCard → insert vào cards, RLS"]
```

Ba quyết định đáng nhớ:

- **Không cache bản dịch hỏng.** `translationSkipped` → bỏ qua `writeCache`, lần sau tra lại.
- **Cụm từ vẫn ra thẻ dùng được:** IPA ghép ở mức từ, còn nghĩa thì dịch cả cụm
  (dịch từng từ rồi ghép là sai với collocation).
- **Làm giàu là best-effort:** Datamuse lỗi/timeout 3.5s → thẻ vẫn tạo bình thường.

---

## 4. Làm giàu thẻ cũ (backfill)

Thẻ tạo trước migration `0007` chưa có CEFR/word family/collocations. Nút "Làm giàu N thẻ"
xử lý dần theo lô, `cards.enriched_at` đánh dấu đã xong nên không chạy lại.

```mermaid
sequenceDiagram
  autonumber
  participant UI as EnrichBackfillButton
  participant DB as Supabase
  participant API as POST /api/enrich
  participant DM as Datamuse
  UI->>DB: đếm thẻ enriched_at IS NULL
  alt không còn thẻ nào
    UI-->>UI: tự ẩn nút
  else còn thẻ
    loop từng lô ≤ 10 từ (có throttle)
      UI->>API: words[]
      API->>API: rate limit bucket "enrich" — 60 lô/phút
      API->>DM: tra word family + collocations
      DM-->>API: kết quả
      API-->>UI: map word → enrichment (KHÔNG ghi DB)
      UI->>DB: client tự update cards + enriched_at (RLS)
    end
  end
```

Server **không** ghi thẻ: giữ nguyên nguyên tắc "dữ liệu người dùng chỉ đi qua RLS".

---

## 5. Hàng đợi hôm nay (hạn mức từ mới)

Vấn đề đã sửa: nhập 200 từ từ Excel → trang chủ báo "200 thẻ cần ôn hôm nay". Nay hàng đợi
tách hai phần, chỉ phần **từ mới** bị giới hạn.

```mermaid
flowchart TD
  A["Tập thẻ — một bộ hoặc cả tài khoản"] --> B{"progress.last_reviewed_at?"}
  B -->|"chưa có"| N["Từ mới"]
  B -->|"đã có"| C{"next_due_at <= bây giờ?"}
  C -->|"rồi"| R["Thẻ tới hạn ôn lại — KHÔNG giới hạn"]
  C -->|"chưa"| S["Chưa tới hạn, bỏ qua hôm nay"]

  P["Cài đặt newPerDay (mặc định 15)"] --> Q
  I["COUNT card_progress.introduced_at >= 00:00 hôm nay"] --> Q["remainingNew = newPerDay − introducedToday"]
  N --> T["news.slice(0, remainingNew)"]
  Q --> T
  T --> HB["Phần dư → newHeldBack — để mai"]

  R --> QUEUE["Hàng đợi phiên học"]
  T --> QUEUE
```

- Hạn mức là **chung cho cả tài khoản**, không cộng dồn theo từng bộ thẻ — học bộ nào
  trước thì bộ đó tiêu hạn mức.
- `dueTodayCount()` (đếm phía server, không tải dòng nào) phải cho **đúng con số** mà
  `buildDueQueue()` dựng ra — nếu lệch thì badge "N thẻ cần ôn" nói dối. Có test canh việc này.
- Reset tiến độ = xóa dòng `card_progress` → thẻ quay về "từ mới" và lại chịu hạn mức.

---

## 6. Lịch ôn SRS — máy trạng thái

```mermaid
stateDiagram-v2
  direction LR
  [*] --> learning: thẻ mới
  state "learning — bước 10 phút → 1 ngày" as learning
  state "review — nhịp giãn cách" as review
  state "relearning — vừa quên, học lại 10 phút" as relearning

  learning --> learning: Chưa thuộc → về bước 0
  learning --> learning: Tạm nhớ → bước kế
  learning --> review: hết bước (Tạm nhớ) → 3 ngày
  learning --> review: Đã thuộc → 5 ngày

  review --> review: Tạm nhớ → khoảng × ease
  review --> review: Đã thuộc → khoảng × ease × 1.3, ease +0.15
  review --> relearning: Chưa thuộc → ease −0.2, khoảng × 0.5, lapses +1

  relearning --> relearning: Chưa thuộc → lại từ bước 0
  relearning --> review: Tạm nhớ / Đã thuộc → giữ khoảng đã rút gọn
```

| Hằng số | Giá trị | Vì sao |
|---|---|---|
| `LEARNING_STEPS_MIN` | `[10, 1440]` | Thẻ mới không nhảy thẳng vào khoảng nhiều ngày |
| `GRADUATING_INTERVAL` / `EASY_INTERVAL` | 3 / 5 ngày | Mốc tốt nghiệp |
| ease | 1.3 – 3.0 | Chặn thẻ khó bị hẹn quá xa / thẻ dễ dồn quá dày |
| `FUZZ_RATIO` | ±5% (từ 4 ngày trở lên) | Cả lô nhập cùng lúc không tới hạn cùng một ngày mãi mãi |
| `MAX_INTERVAL_DAYS` | 365 | Hẹn xa hơn 1 năm là vô nghĩa |
| `LEECH_LAPSES` | 6 lần quên | Nên sửa thẻ thay vì ôn tiếp |

**Khoảng ôn được lưu tường minh** ở `interval_days`, không suy ra từ
`next_due_at − last_reviewed_at` như bản trước `0009` — nhờ vậy ôn sớm hay muộn vài ngày
cũng không làm lệch lịch. `stateFromRow()` vẫn đọc được dữ liệu cũ (thiếu cột → coi như
đã tốt nghiệp).

---

## 7. Phiên học + hoàn tác

```mermaid
sequenceDiagram
  autonumber
  actor U as Người học
  participant S as StudySession
  participant DB as Supabase
  U->>S: chọn chế độ (Ôn hôm nay / chưa thuộc / giới hạn N / xáo trộn)
  S->>DB: nạp cards + card_progress (RLS)
  S->>S: buildDueQueue theo hạn mức từ mới
  loop mỗi thẻ
    U->>S: lật thẻ / trả lời quiz → Chưa thuộc • Tạm nhớ • Đã thuộc
    S->>DB: recordProgress(cardId, status)
    DB->>DB: scheduleReview() → upsert card_progress<br/>(giữ introduced_at của lượt đầu)
    DB->>DB: insert review_events (streak, heatmap)
    DB-->>S: ReviewReceipt = ảnh chụp progress cũ + eventId
    opt Bấm nhầm → "Hoàn tác" (phím Z / Backspace)
      U->>S: Hoàn tác
      S->>DB: undoReview(receipt)
      DB->>DB: khôi phục dòng cũ — hoặc XÓA hẳn nếu thẻ chưa từng ôn
      DB->>DB: xóa dòng review_events tương ứng
      Note over DB: streak/heatmap không đếm lượt đã hủy
    end
  end
  S-->>U: Tóm tắt phiên (đếm theo từng nhóm) + vẫn hoàn tác được lượt cuối
```

Thao tác lật: chạm, **kéo/vuốt ngang** (góc xoay bám theo con trỏ hoặc ngón tay, thả tay ra mới
quyết định lật hẳn hay bật về) hoặc phím Space. Phần quyết định là hàm thuần ở
[flip.ts](../src/lib/flip.ts), nhân bản sang mobile và có test canh không trôi.

Hai chỗ chịu lỗi có chủ đích: `review_events` ghi hỏng thì **không chặn** phiên học
(chỉ mất khả năng hoàn tác lượt đó); migration `0009` chưa chạy thì `recordProgress`
tự ghi lại bằng bộ cột cũ thay vì để người học đứng giữa chừng.

---

## 8. Xóa & thùng rác 30 ngày

```mermaid
flowchart TD
  D["Xóa thẻ / bộ thẻ"] --> A1["1. Đọc bản ghi + card_progress"]
  A1 --> A2["2. INSERT deleted_items (payload jsonb)"]
  A2 --> A3["3. DELETE khỏi cards / decks"]
  A3 --> T["Thùng rác — /trash"]

  T --> R{"Phục hồi?"}
  R -->|"có"| R1{"Bộ thẻ gốc còn không?"}
  R1 -->|"không"| R2["Báo: phục hồi bộ thẻ trước"]
  R1 -->|"còn"| R3["Ghi lại thẻ + card_progress<br/>thẻ trùng từ ở bộ đích thì BỎ QUA và báo số lượng"]
  R -->|"quá 30 ngày"| P["purgeExpired() khi mở trang → xóa hẳn"]
  R -->|"người dùng dọn tay"| P
```

**Lưu trữ trước, xóa sau** — lỗi giữa đường chỉ để lại một bản lưu trữ dư (thẻ gốc còn),
không mất dữ liệu. Và chọn *bảng lưu trữ riêng* thay vì cột `deleted_at`: cách sau bắt
phải sửa **mọi** truy vấn ở cả hai client (phiên học, thống kê, export, chống trùng từ) —
sót một chỗ là thẻ đã xóa lọt vào bài học.

> Mobile hiện chỉ **xóa vào** thùng rác; xem/phục hồi vẫn phải lên web.

---

## 9. Cài đặt theo tài khoản

```mermaid
sequenceDiagram
  autonumber
  participant UI as useSettings()
  participant LS as localStorage / AsyncStorage
  participant DB as profiles.settings (jsonb)
  UI->>LS: loadSettings() — đồng bộ, hiện ngay
  UI-->>UI: ready = true (không nháy giá trị mặc định)
  UI->>DB: fetchRemoteSettings()
  DB-->>UI: bản trên tài khoản
  UI->>UI: merge + sanitizeSettings() — lọc giá trị lạ
  UI->>LS: lưu bản đã merge
  Note over UI,DB: Ghi thì ghi CẢ HAI nơi — lỗi mạng không chặn UI
```

`ready` bật ngay sau bước localStorage vì bước remote **có thể không bao giờ về** (offline).
Theme cố ý **không** đồng bộ — máy khác nhau, nhu cầu sáng/tối khác nhau.

---

## 10. Dữ liệu → màn Tiến độ

`/progress` nạp **một lần** rồi chia dữ liệu cho bốn khối, thay vì mỗi khối tự query.

```mermaid
flowchart LR
  subgraph Q["3 query song song — insights.ts"]
    q1["review_events (364 ngày)"]
    q2["cards + card_progress"]
    q3["COUNT tổng lượt ôn"]
  end
  q1 --> H["Heatmap 52 tuần"]
  q1 --> ST["Streak + biểu đồ 7 ngày"]
  q1 --> W["Bạn hay quên — đếm 'hard' 180 ngày"]
  q1 --> CH["Thử thách hôm nay"]
  q2 --> CH
  q2 --> CAL["Lịch ôn tháng theo next_due_at"]
  q2 --> B["22 huy hiệu / 5 nhóm"]
  q3 --> B
  ST --> B
```

Thử thách hôm nay sinh **tất định theo ngày** (không random, không bảng mới) nên web và
mobile hiện đúng cùng bộ nhiệm vụ. Heatmap/chuỗi dài nhất tính trong cửa sổ **364 ngày**;
riêng tổng lượt ôn đếm toàn bộ phía server.

---

## 11. Mô hình dữ liệu

```mermaid
erDiagram
  auth_users ||--|| profiles : "trigger tạo khi đăng ký"
  auth_users ||--o{ decks : "sở hữu"
  decks ||--o{ cards : "chứa"
  cards ||--o| card_progress : "tiến độ theo user"
  cards ||--o{ review_events : "nhật ký từng lượt ôn"
  auth_users ||--o{ deleted_items : "thùng rác 30 ngày"
  auth_users ||--o{ rate_limit_counters : "cửa sổ đếm lượt"

  profiles {
    uuid id PK
    text default_source_language "chưa dùng ở UI"
    text default_target_language "chưa dùng ở UI"
    jsonb settings "0009 — cài đặt theo tài khoản"
  }
  decks {
    uuid id PK
    uuid user_id FK
    text name
    text source_language "hardcode en"
    text target_language "hardcode vi"
  }
  cards {
    uuid id PK
    uuid deck_id FK
    text term
    text phonetic_us_uk
    text audio_us_uk
    text meaning_vi
    jsonb definitions_examples
    text cefr_level "0006"
    jsonb word_family_collocations "0006"
    timestamptz enriched_at "0007"
  }
  card_progress {
    uuid id PK
    uuid card_id FK
    text status "new hard good easy"
    timestamptz next_due_at
    numeric ease_factor "1.3..3.0"
    numeric interval_days "0009 — lưu tường minh"
    text srs_phase "learning review relearning"
    smallint learning_step
    int lapses
    timestamptz introduced_at "0009 — đếm hạn mức từ mới"
  }
  review_events {
    uuid id PK
    uuid card_id FK "on delete set null"
    text status
    timestamptz reviewed_at
  }
  deleted_items {
    uuid id PK
    text kind "card | deck"
    uuid item_id "id gốc, KHÔNG phải khóa ngoại"
    jsonb payload "bản ghi + tiến độ"
    timestamptz deleted_at
  }
  dictionary_cache {
    text term PK "unique cùng source+target"
    jsonb payload "DraftCard"
  }
  rate_limit_counters {
    uuid user_id PK
    text bucket "lookup | enrich"
  }
```

`dictionary_cache` **dùng chung cho mọi user** (ghi bằng service role, không gắn `user_id`)
— một người tra "resilient" thì người sau khỏi tốn lượt gọi AI. Mọi bảng còn lại bật RLS
theo `auth.uid()`.
