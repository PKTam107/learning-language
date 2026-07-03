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

## Milestone 2 — Hoàn thiện trải nghiệm
- [ ] Di chuyển card giữa deck (bulk).
- [ ] Tìm kiếm / lọc card trong deck.
- [ ] Thống kê dashboard chi tiết (streak, số từ theo trạng thái).
- [ ] Phím tắt đầy đủ + animation lật thẻ mượt.
- [ ] PWA (cài lên màn hình điện thoại, offline cơ bản).

## Milestone 3 — Spaced Repetition thật
- [ ] Triển khai SM-2 dùng `next_due_at`, `ease_factor` (đã để sẵn cột).
- [ ] Hàng đợi ôn tập theo ngày ("hôm nay cần ôn N từ").
- [ ] Lịch nhắc / thông báo.

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

## Backlog / ý tưởng
- Chia sẻ deck công khai, marketplace deck.
- Import/export (CSV, Anki .apkg).
- Chế độ học khác: gõ lại từ (typing), trắc nghiệm, nghe-chép.
- Gamification: điểm, streak, huy hiệu.
