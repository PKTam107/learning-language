# Product Spec — LinguaCards (Web-app học ngôn ngữ qua Flashcard)

> Phiên bản: MVP 0.1 · Cập nhật: 2026-06-21
> Ngôn ngữ MVP: **English (source) → Vietnamese (target)**, kiến trúc sẵn sàng đa ngôn ngữ.

## 1. Tầm nhìn & Mục tiêu

Một web-app giúp người học tự xây dựng và ôn tập bộ từ vựng cá nhân. Điểm khác biệt
cốt lõi: **tự động sinh flashcard** — người dùng chỉ gõ từ, hệ thống tự tra phiên âm,
từ loại, nghĩa, ví dụ và audio qua API bên thứ ba + AI dịch.

Mục tiêu MVP:
- Giảm ma sát khi tạo thẻ xuống mức tối thiểu (gõ từ → Enter → có thẻ đầy đủ).
- Học/ôn tập bằng giao diện lật thẻ tối giản, dùng tốt trên mobile.
- Đồng bộ dữ liệu theo tài khoản (đăng nhập Google) để đổi thiết bị không mất dữ liệu.

Ngoài phạm vi MVP (để dành tương lai):
- Thuật toán Spaced Repetition đầy đủ (SM-2/Anki). MVP chỉ lưu trạng thái thuộc bài.
- Học ngôn ngữ khác ngoài English→Vietnamese (DB đã chuẩn bị field, UI khóa cứng).
- Chia sẻ bộ thẻ công khai, gamification, mobile app native.

## 2. Người dùng & User Stories

**Persona chính:** người Việt tự học tiếng Anh (TOEIC/IELTS/giao tiếp), hay học lúc rảnh trên điện thoại.

| # | User story | Ưu tiên |
|---|------------|---------|
| US-1 | Là người học, tôi gõ một từ tiếng Anh và hệ thống tự điền phiên âm, nghĩa, ví dụ để tôi lưu nhanh | P0 |
| US-2 | Tôi nghe được phát âm US/UK của từ | P0 |
| US-3 | Tôi sửa lại nghĩa/ví dụ trước khi lưu | P0 |
| US-4 | Tôi tạo/sửa/xóa các bộ thẻ theo chủ đề | P0 |
| US-5 | Tôi học bằng cách lật thẻ và tự đánh giá (Hard/Good/Easy) | P0 |
| US-6 | Tôi đăng nhập bằng Google và dữ liệu được đồng bộ | P0 |
| US-7 | Tôi thấy tiến độ trong phiên học (5/20 từ) | P1 |
| US-8 | Tôi di chuyển thẻ giữa các bộ | P1 |
| US-9 | Hệ thống ưu tiên hiện lại từ "Chưa thuộc" | P1 |
| US-10 | Tôi thấy dashboard tổng số từ đã học và nút "Học ngay" | P1 |

## 3. Tính năng chi tiết

### 3.1 Quản lý & Tự động sinh Flashcard (P0 — trái tim app)

**Quick Creator (nút "+" cố định góc màn hình / thanh menu):**
1. Ô input: người dùng nhập 1 từ hoặc cụm từ tiếng Anh.
2. Trigger: nhấn `Enter` hoặc bấm "Tra từ" → gọi `POST /api/lookup`.
3. Auto-populate các trường trả về:
   - **Phonetics** (IPA) + nút nghe **audio US/UK**.
   - **Part of speech** (noun/verb/adj…). Một từ có thể nhiều từ loại → hiển thị nhóm.
   - **Nghĩa tiếng Việt**: ưu tiên nghĩa phổ biến nhất; có thể hiện danh sách nhiều nghĩa để chọn.
   - **Example sentences** (tiếng Anh) kèm bản dịch (nếu có).
4. Chỉnh sửa thủ công: mọi trường đều editable trước khi "Lưu vào bộ thẻ".
5. Chọn bộ thẻ đích (deck) → Lưu.

**Luồng dữ liệu khi lookup:**
- Gọi DictionaryAPI.dev lấy phonetic/audio/POS/definition/example (tiếng Anh).
- Gọi AI provider (OpenAI/Gemini) để dịch nghĩa + ví dụ sang tiếng Việt.
- Gộp kết quả thành 1 "draft card" trả về client.
- Có cache (DB bảng `dictionary_cache`) để tránh gọi lại API cho cùng một từ.

**Deck Management:**
- Tạo / sửa / xóa Deck (tên, mô tả, chủ đề). Ví dụ: "TOEIC 900", "IELTS", "Giao tiếp".
- Di chuyển flashcard giữa các deck.
- Xóa deck → xác nhận; cards trong deck được xóa hoặc chuyển (MVP: xóa cascade có cảnh báo).

### 3.2 Học & Ôn tập (Study Mode) (P0)

**Classic Flashcard Flip:**
- Mặt trước: từ tiếng Anh, phiên âm, nút phát âm.
- Thao tác lật: click thẻ hoặc phím `Space`.
- Mặt sau: nghĩa tiếng Việt, từ loại, ví dụ.

**Self-Assessment** (sau khi lật):
- 3 nút: **Chưa thuộc (Hard)** / **Tạm nhớ (Good)** / **Đã thuộc (Easy)**.
- Lưu trạng thái vào `card_progress` (đặt nền cho SRS sau này).
- Điều hướng phím: `1`=Hard, `2`=Good, `3`=Easy; `←/→` chuyển thẻ.

**Thứ tự thẻ trong phiên (MVP):**
- Ưu tiên thẻ có trạng thái `hard` / chưa học, rồi tới phần còn lại; trộn nhẹ.

**Tiến độ phiên học:** progress bar "Đang học: 5/20 từ".

### 3.3 Tài khoản & Cấu hình (P0)

- **Auth:** Đăng ký / Đăng nhập / Đăng xuất qua Supabase Auth. Ưu tiên **Google OAuth** (giảm ma sát).
- **Đồng bộ:** mọi deck/card/progress gắn `user_id`, bảo vệ bằng Row Level Security.
- **Multi-language foundation:** DB có `source_language` + `target_language`. UI có filter chọn ngôn ngữ nhưng **khóa cứng** ở `en → vi` trong MVP.

### 3.4 UI/UX (P0)

- Responsive desktop + mobile (mobile-first cho study mode).
- **Dashboard:** danh sách deck, tổng số từ đã học, nút "Học ngay".
- **Quick Creator:** FAB "+" cố định góc dưới phải (mobile) / trên thanh menu.
- **Flashcard player:** tối giản, không gây xao nhãng, nút bấm to rõ trên mobile.

## 4. Tiêu chí hoàn thành MVP (Acceptance)

- [ ] Gõ "ephemeral" → Enter → thẻ tự điền IPA, POS, nghĩa VI, ít nhất 1 ví dụ, audio play được.
- [ ] Lưu thẻ vào deck; thẻ xuất hiện trong deck.
- [ ] CRUD deck hoạt động, có RLS (user A không thấy data user B).
- [ ] Study mode lật thẻ + đánh giá; progress bar chạy đúng.
- [ ] Đăng nhập Google; reload/đổi máy vẫn còn dữ liệu.
- [ ] Dùng được trên màn hình 375px (mobile) không vỡ layout.

## 5. Phi chức năng

- Hiệu năng: lookup phản hồi < 3s (có spinner). Cache giảm gọi lặp.
- Bảo mật: API keys chỉ ở server (route handlers); RLS ở DB; không lộ service_role key ra client.
- Chi phí: ưu tiên free tier (DictionaryAPI.dev free, Supabase free, AI dùng token tối thiểu + cache).
- Khả năng mở rộng: provider pattern cho dictionary & AI để thay nhà cung cấp dễ dàng.

Xem thêm: [Architecture](./02-architecture.md) · [DB Schema](./03-database-schema.md) · [API Integration](./04-api-integration.md) · [Roadmap](./05-roadmap.md)
