# Mobile App — LinguaCards

App di động (**Expo / React Native**) của LinguaCards. Không phải hệ thống riêng:
nó dùng **chung Supabase** (cùng database, RLS, tài khoản) và **gọi lại chính các
route handler** của web app. Web + mobile là hai client của cùng một backend.

> Tài liệu vận hành chi tiết nằm cùng package mobile:
> - [`mobile/README.md`](../mobile/README.md) — tech stack, cấu trúc, lệnh nhanh.
> - [`mobile/docs/chay-app.md`](../mobile/docs/chay-app.md) — hướng dẫn chạy chi tiết
>   (emulator trên WSL2, điện thoại thật, build APK, xử lý lỗi).
>
> Doc này mô tả mobile **ở tầng hệ thống** — cách nó khớp với kiến trúc chung. Setup
> từng bước thì xem 2 file trên.

## 1. Vị trí trong hệ thống

```
        ┌──────────────────┐        ┌──────────────────┐
        │  Web (Next.js)   │        │  Mobile (Expo)   │
        │  Browser client  │        │  React Native    │
        └───┬──────────┬───┘        └───┬──────────┬───┘
            │          │                │          │
   RLS trực │          │ fetch /api/*   │ RLS trực │  fetch /api/*
   tiếp     │          │ (cookie)       │ tiếp     │  (Bearer token)
            ▼          ▼                ▼          ▼
     ┌────────────┐  ┌───────────────────────────────┐
     │  Supabase  │  │   Next.js Route Handlers       │
     │  Postgres  │  │   /api/lookup, /api/translate  │
     │  Auth+RLS  │  │   (giữ API key dictionary/AI)  │
     └────────────┘  └───────────────────────────────┘
```

Xem sơ đồ tổng thể ở [02-architecture.md §2](./02-architecture.md#2-sơ-đồ-thành-phần).

## 2. Dùng lại backend như thế nào

| Nhu cầu | Web | Mobile |
|---------|-----|--------|
| Dữ liệu user (decks/cards/progress) | Supabase client trực tiếp (RLS) | Supabase client trực tiếp (RLS) — **giống hệt** |
| Auth | Cookie session (middleware refresh) | Session lưu **AsyncStorage**, `@supabase/supabase-js` tự refresh |
| Tra từ / dịch (giấu API key) | `fetch('/api/lookup')` kèm cookie | `fetch('<API_BASE>/api/lookup')` kèm **`Authorization: Bearer <access_token>`** |

Khác biệt chính so với web: mobile **không** có cookie cùng origin, nên khi gọi route
handler nó gửi access token của session hiện tại qua header `Authorization: Bearer …`
(xem [`mobile/src/lib/api.ts`](../mobile/src/lib/api.ts)). Route handler phía web nhận
token này để xác thực — cùng một endpoint phục vụ cả hai client.

## 3. Cấu hình kết nối backend

Mobile trỏ tới web qua biến `EXPO_PUBLIC_API_BASE_URL` trong `mobile/.env`
(xem [`mobile/.env.example`](../mobile/.env.example)):

| Ngữ cảnh chạy | Giá trị |
|---------------|---------|
| Android emulator | `http://10.0.2.2:3000` (alias trỏ máy host) |
| Điện thoại thật (Expo Go) | `http://<IP-LAN-máy-web>:3000` |
| Web đã deploy | `https://<domain>` (vd Vercel) |

Supabase thì dùng `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` (cùng
giá trị anon với `../.env.local` của web; **không** đưa `service_role` key vào app).

> ⚠️ **Chạy web trong WSL2 + Android emulator:** `next dev` mặc định bind IPv6, mà WSL2
> chỉ forward port IPv4 sang Windows → emulator gọi `10.0.2.2:3000` bị *Connection
> refused* (app báo `network request failed`). Vì vậy script `dev` ở
> [`package.json`](../package.json) gốc là `next dev -H 0.0.0.0` (bind IPv4). Chi tiết:
> [`mobile/docs/chay-app.md`](../mobile/docs/chay-app.md#tra-từ-feature-5--chạy-web-song-song).

## 4. Cấu trúc & tech stack

- **Expo SDK 52 + expo-router v4** (file-based routing trong `mobile/app/`)
- **React Native 0.76** + TypeScript
- **@supabase/supabase-js** + AsyncStorage (session lưu trên máy)

Cây thư mục chi tiết: [`mobile/README.md`](../mobile/README.md#cấu-trúc).

## 5. Trạng thái tính năng

| | Tính năng | Trạng thái |
|-|-----------|:----------:|
| 1 | Skeleton + auth email + điều hướng gác session | ✅ |
| 2 | Danh sách bộ thẻ + CRUD | ✅ |
| 3 | Danh sách card trong bộ thẻ + xóa | ✅ |
| 4 | Study mode: lật thẻ, đánh giá, audio US/UK | ✅ |
| 5 | Tra cứu & thêm từ (QuickCreator → `/api/lookup`) | ✅ |
| 6 | Google OAuth, dashboard thống kê | ⬜ |

## 6. Chạy nhanh

```bash
# 1. Web (backend) — terminal ở thư mục gốc repo
npm run dev

# 2. Mobile — terminal ở mobile/
cd mobile && npm install && npm start
```

Đầy đủ (emulator WSL2, điện thoại thật, build APK):
[`mobile/docs/chay-app.md`](../mobile/docs/chay-app.md).
