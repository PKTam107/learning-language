# LinguaCards 🎴

Web-app học ngôn ngữ qua **flashcard tự sinh**. Gõ một từ tiếng Anh → hệ thống tự
tra phiên âm, từ loại, nghĩa (dịch sang tiếng Việt bằng AI), ví dụ và audio US/UK.
MVP: **English → Vietnamese**, kiến trúc DB đã sẵn sàng cho đa ngôn ngữ.

## Tech stack

- **Next.js 14 (App Router) + TypeScript** — frontend + API route handlers
- **Tailwind CSS** — UI responsive (mobile-first)
- **Supabase** — Postgres + Auth (Google OAuth) + RLS
- **DictionaryAPI.dev** — phiên âm / audio / nghĩa tiếng Anh / ví dụ
- **OpenAI / Gemini** — dịch nghĩa & ví dụ sang tiếng Việt (qua provider abstraction)

## Tài liệu

Xem thư mục [`docs/`](./docs):
- [01 — Product Spec](./docs/01-product-spec.md)
- [02 — Architecture](./docs/02-architecture.md)
- [03 — Database Schema](./docs/03-database-schema.md)
- [04 — API Integration](./docs/04-api-integration.md)
- [05 — Roadmap](./docs/05-roadmap.md)
- [06 — Mobile App](./docs/06-mobile.md)
- [07 — Current State & Plan](./docs/07-current-state.md)
- [08 — Tóm tắt tính năng hiện tại](./docs/08-features.md)

## Bắt đầu

### 1. Cài dependencies
```bash
npm install
```

### 2. Tạo Supabase project
1. Vào https://supabase.com → New Project.
2. Mở **SQL Editor** → dán nội dung [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql) → **Run**.
3. Bật **Google OAuth**: Dashboard → Authentication → Providers → Google
   (tạo OAuth Client ID/Secret ở [Google Cloud Console](https://console.cloud.google.com/),
   thêm redirect URL: `https://<project>.supabase.co/auth/v1/callback`).
4. Authentication → URL Configuration → thêm `http://localhost:3000/auth/callback` vào Redirect URLs.

### 3. Cấu hình môi trường
```bash
cp .env.example .env.local
```
Điền:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Settings → API).
- `AI_PROVIDER` = `openai` hoặc `gemini` + key tương ứng.
  *(Bỏ trống key AI vẫn chạy được — chỉ là nghĩa giữ tiếng Anh, bạn tự sửa khi tạo thẻ.)*

### 4. Chạy dev
```bash
npm run dev
```
Mở http://localhost:3000

## Mobile app 📱

Có app di động (**Expo / React Native**) dùng **chung Supabase và chính các route
handler** của web app — web + mobile là hai client của cùng một backend. Xem
[docs/06-mobile.md](./docs/06-mobile.md) (tầng hệ thống) và
[`mobile/README.md`](./mobile/README.md) (setup, chạy).

## Luồng sử dụng

1. Đăng nhập (Google hoặc email).
2. Tạo bộ thẻ (vd "TOEIC 900").
3. Bấm nút **+** góc dưới phải → gõ từ → Enter → sửa nếu cần → **Lưu**.
4. Bấm **Học ngay** → lật thẻ (Space) → đánh giá **Chưa thuộc / Tạm nhớ / Đã thuộc** (phím 1/2/3).

## Lệnh hữu ích

| Lệnh | Tác dụng |
|------|----------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm run start` | Chạy bản build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Kiểm tra TypeScript |

## Cấu trúc thư mục

Xem [docs/02-architecture.md §3](./docs/02-architecture.md).

## Định hướng tiếp theo

Xem [Roadmap](./docs/05-roadmap.md): Spaced Repetition (SM-2), mở khóa đa ngôn ngữ, PWA, import/export Anki.
