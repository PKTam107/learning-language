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

## Backlog / ý tưởng
- Chia sẻ deck công khai, marketplace deck.
- Import/export (CSV, Anki .apkg).
- Chế độ học khác: gõ lại từ (typing), trắc nghiệm, nghe-chép.
- Gamification: điểm, streak, huy hiệu.
