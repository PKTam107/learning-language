# Roadmap — LinguaCards

## Milestone 0 — Scaffold (đã tạo bởi setup này)
- [x] Cấu trúc thư mục + docs.
- [x] Config Next.js + TS + Tailwind.
- [x] Schema SQL + RLS.
- [x] Supabase client/server + middleware.
- [x] Provider dictionary + AI (abstraction).
- [x] Route handlers `/api/lookup`, `/api/translate`.
- [x] UI khung: login, dashboard, decks, study, QuickCreator.

## Milestone 1 — MVP chạy được (việc cần làm tiếp)
- [ ] Tạo Supabase project, chạy migration `0001_init.sql`.
- [ ] Bật Google OAuth trong Supabase (Client ID/Secret từ Google Cloud Console).
- [ ] Điền `.env.local` (xem `.env.example`).
- [ ] `npm install` + `npm run dev`.
- [ ] Test luồng: login → tạo deck → lookup từ → lưu → study.
- [ ] Hoàn thiện edge case: từ không tìm thấy, mất mạng, AI lỗi.

> Hiện trạng thực tế + kế hoạch chi tiết (P1–P4): xem [07-current-state.md](./07-current-state.md).

## Milestone 2 — Hoàn thiện trải nghiệm
- [x] Sửa thẻ đã lưu + xem chi tiết card (P1).
- [x] Di chuyển card giữa deck (P1; bulk vẫn để sau).
- [x] Tìm kiếm / lọc card trong deck (P1).
- [x] Thống kê dashboard chi tiết (streak, số từ theo trạng thái, trang Tiến độ).
- [ ] Phím tắt đầy đủ + animation lật thẻ mượt. *(đã có Space / 1-2-3 / →, và **Z** hoàn tác)*
- [x] Dark mode (web): Sáng / Tối / Theo máy, nhớ theo thiết bị, không nháy nền khi tải.
- [x] PWA (cài lên màn hình chính + trang dự phòng khi mất mạng). *Học offline thật sự
      — cache dữ liệu bài học — vẫn còn ở backlog.*
- [x] Dark mode cho bản mobile (đã chuyển 31 file StyleSheet sang theme động).

## Milestone 3 — Spaced Repetition thật
- [x] Triển khai SM-2 dùng `next_due_at`, `ease_factor` (đã để sẵn cột).
- [x] **Lịch ôn có bước học** (migration `0009`): learning → review → relearning, khoảng ôn lưu
      tường minh (`interval_days`), nhiễu ±5% chống dồn lịch, trần 365 ngày. Xem
      [srs.ts](../src/lib/srs.ts).
- [x] Hàng đợi ôn tập theo ngày ("hôm nay cần ôn N từ") + **hạn mức từ mới mỗi ngày**
      ([queue.ts](../src/lib/queue.ts)).
- [x] **Hoàn tác lượt đánh giá** trong phiên học.
- [x] Lịch nhắc / thông báo (mobile: local notification; web: banner in-app).

## Milestone 4 — Đa ngôn ngữ
- [ ] Mở khóa filter ngôn ngữ (en→vi, ja→vi, en→ja...).
- [ ] Dictionary provider theo từng ngôn ngữ nguồn.
- [ ] i18n giao diện.

## Mobile app (Expo / React Native)

Client thứ 2, dùng chung backend với web (chi tiết: [06-mobile.md](./06-mobile.md)).

- [x] Feature 1 — Skeleton + auth email + điều hướng gác session.
- [x] Feature 2 — Danh sách bộ thẻ + CRUD.
- [x] Feature 3 — Danh sách card trong bộ thẻ + xóa.
- [x] Feature 4 — Study mode: lật thẻ, đánh giá, audio US/UK.
- [x] Feature 5 — Tra cứu & thêm từ (QuickCreator → `/api/lookup` qua Bearer token).
- [ ] Feature 6 — Google OAuth, dashboard thống kê.
- [ ] Build APK/EAS phát hành, đồng bộ Spaced Repetition khi web có (Milestone 3).

## Milestone 5 — An toàn dữ liệu & cấu hình (P0, xong)
- [x] **Thùng rác 30 ngày** cho thẻ & bộ thẻ (bảng `deleted_items`), phục hồi kèm tiến độ.
- [x] **Cài đặt đi theo tài khoản** (`profiles.settings`); riêng theme vẫn theo thiết bị.
- [x] **Unit test** (Vitest) cho lịch ôn + hàng đợi, kèm test canh bản sao web/mobile không trôi.

## Backlog / ý tưởng
- Chia sẻ deck công khai, marketplace deck.
- Import Anki (.apkg). *(đã có import Excel + export CSV/Excel/JSON)*
- Xử lý thẻ "leech" (cột `lapses` đã có sẵn từ `0009`): tạm treo thẻ quên quá nhiều lần.
- Thêm từ từ đoạn văn (mining) + tra hàng loạt; kiểu ôn điền chỗ trống (cloze); luyện nói.
- Phục hồi thùng rác trên bản mobile; web push; học offline thật sự.
