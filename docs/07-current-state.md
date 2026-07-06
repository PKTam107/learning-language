# Current State & Development Plan — LinguaCards

Đặc tả **hiện trạng thực tế (as-built)** của web app + kế hoạch phát triển tiếp.
Cập nhật lần cuối: sau khi deploy Vercel + hoàn tất mobile Feature 1–5.

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
| Audio | US/UK từ DictionaryAPI | [AudioButton.tsx](../src/components/flashcard/AudioButton.tsx) |
| Dashboard | Stat: số bộ thẻ / tổng từ / "EN→VI" | [DecksManager.tsx](../src/components/deck/DecksManager.tsx) |

### A4. Khoảng trống & nợ kỹ thuật
1. ~~**Sửa thẻ đã lưu**~~ — ✅ đã làm (P1).
2. ~~**Chuyển thẻ giữa deck (UI)**~~ — ✅ đã làm (P1); `moveCard()` đã có sẵn từ trước.
3. ~~**Tìm/lọc card trong deck**~~ — ✅ đã làm (P1).
4. ~~**Xem chi tiết card**~~ (definitions/examples/audio UK ngoài study) — ✅ đã làm (P1).
5. **Spaced Repetition**: cột `next_due_at`/`ease_factor` để sẵn nhưng study chỉ sort theo
   status — **chưa có lịch ôn / "hôm nay cần ôn N từ"**. → P2.
6. **Đa ngôn ngữ**: DB sẵn sàng nhưng UI/logic hardcode EN→VI. → P3.
7. **Dashboard thống kê thật** (streak, phân bố theo status): chưa có. → P2.
8. **Rate limit** `/api/lookup`: chưa có. → P4.
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

**P2.3 — Spaced Repetition (SM-2)**
- [ ] Dùng `next_due_at`, `ease_factor` (đã có cột): đánh giá → tính lịch ôn lại.
- [ ] Hàng đợi **"Ôn hôm nay"** (`next_due_at <= now()`) + dashboard "cần ôn N từ" + streak.

### P3 — Đa ngôn ngữ (mở khóa kiến trúc DB có sẵn)
- [ ] Dùng `profiles.default_source/target_language`; chọn ngôn ngữ khi tạo deck (bỏ hardcode).
- [ ] Dictionary provider **theo source language** (ngoài DictionaryAPI.dev).
- [ ] i18n giao diện.

### P4 — Mở rộng / vận hành
- [ ] Import/export (CSV, Anki `.apkg`), chia sẻ deck công khai.
- [ ] Chế độ học khác: gõ lại (typing), trắc nghiệm.
- [ ] PWA (offline cơ bản).
- [ ] Rate limit `/api/lookup` + test cho lookup pipeline & db helpers.
- [ ] Mobile Feature 6 (Google OAuth + dashboard) cho ngang web.
