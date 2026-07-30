# Current State & Development Plan — LinguaCards

Đặc tả **hiện trạng thực tế (as-built)** của web app + kế hoạch phát triển tiếp.
Cập nhật lần cuối: thêm **trang Tiến độ** (huy hiệu, heatmap 1 năm, lịch ôn) + **thử thách
hôm nay** trên trang chủ — có cả ở web và mobile.

> Đây là tài liệu "sống" — mô tả code **đang có**, khác với 01-product-spec (tầm nhìn)
> và 05-roadmap (kế hoạch dài hạn). Khi hoàn thành hạng mục, cập nhật lại mục A/B.

---

## A. Đặc tả hiện trạng

### A1. Nền tảng
- **Next.js 14 App Router + TypeScript**, Tailwind. Deploy **Vercel** (production `main`).
- **Supabase**: Postgres + Auth + RLS.
- Data người dùng: client query **trực tiếp** Supabase (RLS `auth.uid()`).
- Dictionary/AI: **qua route handler** server (giấu key). Auth route handler chấp nhận
  **cookie (web)** lẫn **Bearer token (mobile)** — [src/lib/supabase/getUser.ts](../src/lib/supabase/getUser.ts).

### A2. Data model — [supabase/migrations/0001_init.sql](../supabase/migrations/0001_init.sql)
| Bảng | Vai trò | Ghi chú |
|---|---|---|
| `profiles` | Hồ sơ user (+ `default_source/target_language`) | Cột ngôn ngữ **chưa dùng ở UI** |
| `decks` | Bộ thẻ (+ `source/target_language`) | `createDeck` **hardcode `en`/`vi`** |
| `cards` | Thẻ từ: term, phonetic, audio_us/uk, POS, meaning_vi, definitions/examples (jsonb) | |
| `card_progress` | Tiến độ (status, review_count, last_reviewed_at) | `next_due_at`, `ease_factor` để sẵn cho SM-2 — **chưa dùng** |
| `dictionary_cache` | Cache lookup dùng chung | Ghi qua service role |

Trigger: tự tạo `profile` khi có user mới; tự cập nhật `updated_at`.

### A3. Tính năng đã chạy
| Nhóm | Có gì | File chính |
|---|---|---|
| Auth | Google OAuth + email/password (signin/signup) | [login/page.tsx](../src/app/(auth)/login/page.tsx) |
| Decks | List (đếm card) + tạo/sửa/xóa + stats bar | [DecksManager.tsx](../src/components/deck/DecksManager.tsx) |
| Cards | Thêm qua tra từ, list, xóa | [DeckDetail.tsx](../src/components/deck/DeckDetail.tsx) |
| Tra & tạo thẻ | FAB "+" → gõ → tra → sửa (DraftEditor) → lưu; giữ modal cho flow nhanh | [QuickCreator.tsx](../src/components/QuickCreator.tsx) |
| Lookup pipeline | cache → DictionaryAPI.dev → AI dịch → fallback dịch cả cụm nếu notFound → ghi cache | [lib/lookup.ts](../src/lib/lookup.ts) |
| Translate providers | mymemory (default, free), openai, gemini, libretranslate | [lib/ai/index.ts](../src/lib/ai/index.ts) |
| Study mode | Lật thẻ (Space), đánh giá 1/2/3, progress bar, sắp xếp ưu tiên hard→new→good→easy | [StudySession.tsx](../src/components/flashcard/StudySession.tsx) |
| Kiểu ôn đa dạng | Lật thẻ / trắc nghiệm (MCQ) / gõ từ (sai ≤1 ký tự) / nghe; tự chấm → good/hard | [quiz.ts](../src/lib/quiz.ts), [QuizCard.tsx](../src/components/flashcard/QuizCard.tsx) |
| Audio | US/UK từ DictionaryAPI + TTS fallback; tự phát âm khi lật thẻ (theo cài đặt) | [speak.ts](../src/lib/speak.ts), [AudioButton.tsx](../src/components/flashcard/AudioButton.tsx) |
| Streak | Nhật ký `review_events` → streak + lượt hôm nay/tuần + biểu đồ 7 ngày (dashboard) | [db/stats.ts](../src/lib/db/stats.ts), [StreakCard.tsx](../src/components/StreakCard.tsx), [StudyOverview.tsx](../src/components/StudyOverview.tsx) |
| Cài đặt & nhắc học | localStorage (autoSpeak, reminder giờ) + banner nhắc trên dashboard | [settings.ts](../src/lib/settings.ts), [SettingsForm.tsx](../src/components/SettingsForm.tsx) |
| Rate limit | `/api/lookup` 30 lượt/phút/user qua RPC `consume_rate_limit` (fixed window) | [0005_rate_limit.sql](../supabase/migrations/0005_rate_limit.sql), [api/lookup/route.ts](../src/app/api/lookup/route.ts) |
| Làm giàu thẻ | Tra từ mới → CEFR (danh sách CEFR-J offline) + word family + collocations (Datamuse), cache vào card | [enrich.ts](../src/lib/enrich.ts), [cefr.ts](../src/lib/cefr.ts), [data/cefr.json](../src/data/cefr.json), [Enrichment.tsx](../src/components/flashcard/Enrichment.tsx) |
| Backfill thẻ cũ | Nút "Làm giàu N thẻ" (deck + dashboard), tự ẩn khi hết; `/api/enrich` tính, client cập nhật; cột `enriched_at` đánh dấu đã xử lý | [0007_card_enriched_at.sql](../supabase/migrations/0007_card_enriched_at.sql), [api/enrich/route.ts](../src/app/api/enrich/route.ts), [db/enrich-backfill.ts](../src/lib/db/enrich-backfill.ts), [EnrichBackfillButton.tsx](../src/components/EnrichBackfillButton.tsx) |
| Weak Words | "Bạn hay quên": xếp từ theo số lần đánh giá `hard` từ `review_events` | [db/weak.ts](../src/lib/db/weak.ts), [WeakWords.tsx](../src/components/WeakWords.tsx), [/weak](../src/app/weak/page.tsx) |
| Thử thách hôm nay | 3–4 nhiệm vụ tất định theo ngày (giữ chuỗi / ôn N lượt / thêm từ mới / 1 nhiệm vụ luân phiên); tiến độ đo từ `review_events` + `cards.created_at` | [challenge.ts](../src/lib/challenge.ts), [db/insights.ts](../src/lib/db/insights.ts), [DailyChallenge.tsx](../src/components/DailyChallenge.tsx) |
| Huy hiệu | 22 mốc / 5 nhóm (thẻ, đã thuộc, chuỗi dài nhất, lượt ôn, ngày có học) | [achievements.ts](../src/lib/achievements.ts), [Achievements.tsx](../src/components/Achievements.tsx) |
| Heatmap học tập | Lưới 52 tuần kiểu GitHub từ `review_events`, 5 mức đậm theo ngày ôn nhiều nhất | [Heatmap.tsx](../src/components/Heatmap.tsx), [streak.ts](../src/lib/streak.ts) |
| Lịch ôn tập | Lịch tháng đếm thẻ tới hạn theo `card_progress.next_due_at`; chạm ngày → danh sách từ | [ReviewCalendar.tsx](../src/components/ReviewCalendar.tsx) |
| Dashboard | Stat + streak + banner nhắc học + thử thách hôm nay + "Bạn hay quên" | [DecksManager.tsx](../src/components/deck/DecksManager.tsx), [StudyOverview.tsx](../src/components/StudyOverview.tsx), [DailyChallenge.tsx](../src/components/DailyChallenge.tsx), [WeakWords.tsx](../src/components/WeakWords.tsx) |
| Trang Tiến độ | `/progress`: 4 ô số + heatmap + huy hiệu + lịch ôn, **1 lần nạp** dùng chung dữ liệu (3 query song song) | [/progress](../src/app/progress/page.tsx), [ProgressDashboard.tsx](../src/components/ProgressDashboard.tsx), [db/insights.ts](../src/lib/db/insights.ts) |

### A4. Khoảng trống & nợ kỹ thuật
1. ~~**Sửa thẻ đã lưu**~~ — ✅ đã làm (P1).
2. ~~**Chuyển thẻ giữa deck (UI)**~~ — ✅ đã làm (P1); `moveCard()` đã có sẵn từ trước.
3. ~~**Tìm/lọc card trong deck**~~ — ✅ đã làm (P1).
4. ~~**Xem chi tiết card**~~ (definitions/examples/audio UK ngoài study) — ✅ đã làm (P1).
5. ~~**Spaced Repetition**~~ — ✅ đã làm (P2.3): `recordProgress` tính `next_due_at`/`ease_factor`,
   có chế độ "Ôn hôm nay" + số thẻ đến hạn.
6. **Đa ngôn ngữ**: DB sẵn sàng nhưng UI/logic hardcode EN→VI. → P3.
7. ~~**Dashboard thống kê thật (streak)**~~ — ✅ đã làm: streak + biểu đồ 7 ngày trên dashboard
   (web + mobile), dựa trên bảng `review_events`. Mở rộng ở P2.6: trang **Tiến độ** (huy hiệu,
   heatmap 52 tuần, lịch ôn) + **thử thách hôm nay**.
   *Giới hạn hiện tại:* heatmap/chuỗi dài nhất/số ngày có học tính trong cửa sổ **364 ngày**
   gần nhất (tổng lượt ôn thì đếm toàn bộ qua `count` phía server).
8. ~~**Rate limit** `/api/lookup`~~ — ✅ đã làm: 30 lượt/phút/user qua RPC Supabase.
9. **Test**: chưa có. → P4.

---

## B. Kế hoạch phát triển

### P1 — Hoàn thiện trải nghiệm cốt lõi ✅ (đang triển khai / xong)
- [x] Sửa thẻ đã lưu (tái dùng DraftEditor + `updateCard`).
- [x] Chuyển thẻ giữa deck (UI dùng `moveCard`).
- [x] Tìm/lọc card trong deck.
- [x] Xem chi tiết card (definitions/examples/audio UK).

### P2 — Trạng thái học dùng được & học đa năng — *khác biệt sản phẩm*

**Mô hình trạng thái (thống nhất mọi nơi):**

| DB | Nhãn | Màu | Ý nghĩa |
|---|---|---|---|
| `new` | Chưa học | ⚪ xám | Chưa ôn lần nào |
| `hard` | Chưa thuộc | 🔴 đỏ | Đánh giá "khó" |
| `good` | Đang thuộc | 🟡 vàng | "tạm nhớ" |
| `easy` | Đã thuộc | 🟢 xanh | "đã thuộc" |

Nguồn sự thật nhãn/màu: [src/lib/status.ts](../src/lib/status.ts).

**P2.1 — Hiển thị trạng thái** (nền tảng UX, không đụng logic)
- [ ] `StatusBar` (thanh tiến độ theo màu + chú thích số) + `StatusDot` (chấm màu mỗi thẻ).
- [ ] Deck detail: header % đã thuộc + breakdown; **lọc theo trạng thái** (kết hợp ô tìm P1); chấm màu mỗi hàng.
- [ ] Deck card (list) + Dashboard: mini bar + số "đã thuộc / tổng"; stat tổng hợp toàn tài khoản.
- [ ] `fetchDecksWithStats()` — đếm theo status (2 query cho cả list, không N+1).

**P2.2 — Học đa năng** ✅
- [x] Màn chọn chế độ trước phiên: Ôn tất cả / Chỉ từ chưa thuộc (new+hard) / giới hạn số thẻ / xáo trộn.
- [x] Tóm tắt sau phiên (đếm số từ đánh giá theo mỗi nhóm).

**P2.3 — Spaced Repetition + Streak** ✅
- [x] SM-2 rút gọn trong `recordProgress`: đánh giá → tính `next_due_at` + cập nhật
  `ease_factor` (hard: ôn lại 1 ngày & giảm ease; good: khoảng × ease; easy: × ease × 1.3).
- [x] Chế độ **"Ôn hôm nay"** (thẻ đến hạn / chưa học) trong màn chọn chế độ; mặc định
  chọn khi có thẻ đến hạn.
- [x] Deck detail + deck card + dashboard hiện **số thẻ cần ôn** (`due`).
- [x] **Streak** (chuỗi ngày học liên tục): bảng `review_events` (migration `0004`) ghi từng
  lượt ôn; dashboard hiện streak + biểu đồ 7 ngày (web + mobile).

**P2.4 — Kiểu ôn đa dạng + nhắc học** ✅ (web + mobile)
- [x] Kiểu ôn: lật thẻ / trắc nghiệm (MCQ) / gõ từ / nghe — tự chấm, quy về good/hard.
- [x] Trang Cài đặt: tự phát âm khi lật thẻ + nhắc học hằng ngày. Web dùng **banner in-app**
  (dashboard); mobile dùng **local notification**. Cài đặt lưu theo thiết bị.

**P2.5 — Làm giàu thẻ + Weak Words** ✅ (web) — migration `0006`
- [x] **Weak Words** ("Bạn hay quên"): xếp từ theo số lần đánh giá `hard` (180 ngày) — dashboard + `/weak`.
- [x] **CEFR (A1–C2):** bundle `src/data/cefr.json` (CEFR-J, CC BY-SA) → badge màu; tra offline.
- [x] **Word family + Collocations:** Datamuse (miễn phí, không key), lọc theo tần suất; sinh khi
  tra **từ đơn tiếng Anh mới** rồi cache vào `cards.word_family/collocations/cefr_level`.
- [x] **Backfill thẻ cũ** (migration `0007` + cột `enriched_at`): nút "Làm giàu N thẻ" ở deck +
  dashboard, chạy `/api/enrich` theo lô có throttle/rate-limit, **tự ẩn khi hết**.
- [x] **Mobile ngang bằng:** hiển thị CEFR/word family/collocations (CardDetail + DraftEditor),
  "Bạn hay quên" (màn chính), nút "Làm giàu N thẻ" (deck + màn chính). Dùng chung `/api/lookup`
  + `/api/enrich`.
- [ ] Nâng chất word family (WordNet/AI). → sau.

**P2.6 — Tiến độ & động lực học** ✅ (web + mobile) — migration `0008` (chỉ thêm index)
- [x] **Huy hiệu:** 22 mốc / 5 nhóm, chỉ đọc dữ liệu có sẵn (số thẻ, `card_progress.status`,
  `review_events`). Nhóm chuỗi ngày xét theo **chuỗi dài nhất** nên không bị mất khi đứt chuỗi.
- [x] **Heatmap 52 tuần** kiểu GitHub Calendar từ `review_events` (cột = tuần, Thứ 2 → CN).
- [x] **Thử thách hôm nay:** sinh **tất định theo ngày** (không random, không bảng mới) →
  web/mobile hiện cùng nhiệm vụ; mục tiêu co giãn theo số thẻ tới hạn & kích thước kho thẻ.
- [x] **Lịch ôn tập:** lịch tháng đếm thẻ tới hạn theo `next_due_at` (thẻ chưa học/quá hạn gom
  vào hôm nay), chạm ngày → danh sách từ → mở deck.
- [x] Gom helper ngày/chuỗi vào [streak.ts](../src/lib/streak.ts) (web) và
  `mobile/src/lib/streak.ts`; `stats.ts` (streak card) dùng lại chính các helper này.
- [x] Migration `0008`: index `card_progress(user_id, next_due_at)` + `cards(user_id, created_at)`.

### P3 — Đa ngôn ngữ (mở khóa kiến trúc DB có sẵn)
- [ ] Dùng `profiles.default_source/target_language`; chọn ngôn ngữ khi tạo deck (bỏ hardcode).
- [ ] Dictionary provider **theo source language** (ngoài DictionaryAPI.dev).
- [ ] i18n giao diện.

### P4 — Mở rộng / vận hành
- [x] Import Excel (`.xlsx`) + export CSV/Excel/JSON + backup tài khoản.
- [ ] Nhập Anki (`.apkg`), chia sẻ deck công khai.
- [x] Chế độ học khác: gõ lại (typing), trắc nghiệm, nghe.
- [ ] PWA (offline cơ bản).
- [x] Rate limit `/api/lookup` (30 lượt/phút/user qua RPC Supabase).
- [ ] Test cho lookup pipeline & db helpers.
- [x] Mobile Google OAuth (đăng nhập) cho ngang web.
